// noinspection ExceptionCaughtLocallyJS

import fs from "fs/promises";
import path from "path";
import type { PathLike } from "node:fs";
import type { ComprehensivePokemonData, PokemonData } from "../types/pokemon";
import type { GenericPropertyDetails, PaginatedResponse } from "../types";
import type { Species } from "../types/species";
import type { Chain, EvolutionChain } from "../types/evolutions";

const BASE_URL = "https://pokeapi.co/api/v2";
const OUTPUT_DIR = "./pokemon-data";
const CUSTOM_DATA_DIR = "./custom-pokemon-data";

// Rate limiting to be respectful to the API
const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

class PokemonScraper {
  customData: Map<number, any>;
  scrapedData: Map<any, any>;
  failedUrls: string[];
  failedPokemon: string[];

  constructor() {
    this.customData = new Map();
    this.scrapedData = new Map();
    this.failedUrls = [];
    this.failedPokemon = [];
  }

  async init(): Promise<void> {
    // Create output directories
    await this.ensureDirectoryExists(OUTPUT_DIR);
    await this.ensureDirectoryExists(`${OUTPUT_DIR}/individual`);
    await this.ensureDirectoryExists(`${OUTPUT_DIR}/species`);
    await this.ensureDirectoryExists(`${OUTPUT_DIR}/evolution-chains`);

    // Load any existing custom data
    await this.loadCustomData();
  }

  async ensureDirectoryExists(dir: PathLike): Promise<void> {
    try {
      await fs.access(dir);
    } catch {
      await fs.mkdir(dir, { recursive: true });
    }
  }

  async loadCustomData(): Promise<void> {
    try {
      const customDataPath = path.join(CUSTOM_DATA_DIR, "custom-data.json");
      const data = await fs.readFile(customDataPath, "utf8");
      const customEntries = JSON.parse(data);

      customEntries.forEach((entry: any) => {
        this.customData.set(entry.id, entry);
      });

      console.log(`Loaded ${this.customData.size} custom data entries`);
    } catch (error) {
      console.log("No custom data file found, starting fresh");
    }
  }

  async fetchWithRetry<T>(url: string, retries: number = 3): Promise<T | null> {
    for (let i = 1; i < retries; i++) {
      try {
        const response = await fetch(url);

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        return (await response.json()) as T;
      } catch (error) {
        console.log(
          `Attempt ${i} failed for ${url}:`,
          (error as Error).message,
        );
        await delay(2000 * i);
      }
    }

    this.failedUrls.push(url);

    return null;
  }

  async fetchPokemonList(): Promise<GenericPropertyDetails[]> {
    console.log("Fetching Pokemon list...");

    const response = await this.fetchWithRetry<
      PaginatedResponse<GenericPropertyDetails>
    >(`${BASE_URL}/pokemon?limit=100000&offset=0`);

    return response?.results || [];
  }

  async fetchPokemonData(pokemon: GenericPropertyDetails): Promise<{
    pokemonData: PokemonData | null;
    speciesData: Species | null;
    evolutionChain: EvolutionChain | null;
  }> {
    console.log(`Fetching data for ${pokemon.name}...`);

    const pokemonData = await this.fetchWithRetry<PokemonData>(pokemon.url);
    await delay(1000);

    const speciesData = await this.fetchWithRetry<Species>(
      pokemonData!.species.url,
    );
    await delay(1000);

    let evolutionChain = null;

    if (speciesData && speciesData.evolution_chain.url) {
      try {
        evolutionChain = await this.fetchWithRetry<EvolutionChain>(
          speciesData.evolution_chain.url,
        );

        await delay(1000);
      } catch (error) {
        console.log(`Failed to fetch evolution chain for ${pokemon.name}`);
      }
    }

    return {
      pokemonData: pokemonData,
      speciesData: speciesData,
      evolutionChain: evolutionChain,
    };
  }

  // // TODO: We might not need this function at all
  // processEvolutionChain(evolutionData: EvolutionChain) {
  //   if (!evolutionData) return null;
  //
  //   const processChainLink = (chain: Chain) => {
  //     const evolution: Chain = Object.create(chain);
  //
  //     if (chain.evolves_to && chain.evolves_to.length > 0) {
  //       evolution.evolves_to = chain.evolves_to.map(processChainLink);
  //     }
  //
  //     return evolution;
  //   };
  //
  //   return {
  //     id: evolutionData.id,
  //     chain: processChainLink(evolutionData.chain),
  //   };
  // }
  //
  // // TODO: Check this if I really want to enter custom data
  // enhanceWithCustomData(pokemonData: any, customData: any) {
  //   if (!customData) return pokemonData;
  //
  //   return {
  //     ...pokemonData,
  //     sprites: {
  //       ...pokemonData.sprites,
  //       ...(customData.sprites && { custom: customData.sprites }),
  //     },
  //     enhanced: true,
  //     last_updated: new Date().toISOString(),
  //   };
  // }

  async createComprehensivePokemonEntry(
    pokemon: GenericPropertyDetails,
  ): Promise<ComprehensivePokemonData | null> {
    try {
      const { pokemonData, speciesData, evolutionChain } =
        await this.fetchPokemonData(pokemon);

      if (!pokemonData || !speciesData || !evolutionChain) {
        this.failedPokemon.push(pokemon.name);

        return null;
      }

      // // Get custom data if available
      // const customData = this.customData.get(pokemonData.id);

      return {
        // Basic info
        id: pokemonData.id,
        name: pokemonData.name,
        is_default: pokemonData.is_default,
        types: pokemonData.types,
        stats: pokemonData.stats,
        sprites: pokemonData.sprites,

        // TODO: fetch stuff from Forms url

        // From Species Data
        displayName: speciesData.names.find(
          (name) => name.language.name === "en",
        )!.name,
      };

      // // Enhance with custom data
      // return this.enhanceWithCustomData(comprehensiveEntry, customData);
    } catch (error) {
      console.error(`Error processing ${pokemon.name}:`, error);
      return null;
    }
  }

  getLatestFlavorText(flavorTextEntries) {
    if (!flavorTextEntries) return null;

    const englishEntries = flavorTextEntries
      .filter((entry) => entry.language.name === "en")
      .sort((a, b) => {
        // Prioritize newer games
        const gameOrder = {
          scarlet: 10,
          violet: 10,
          "legends-arceus": 9,
          "brilliant-diamond": 8,
          "shining-pearl": 8,
          sword: 7,
          shield: 7,
        };
        return (
          (gameOrder[b.version.name] || 0) - (gameOrder[a.version.name] || 0)
        );
      });

    return englishEntries[0]?.flavor_text?.replace(/\f/g, " ") || null;
  }

  async scrapeAllPokemon() {
    console.log("Starting comprehensive Pokemon data scraping...");

    const pokemonList = await this.fetchPokemonList();
    const totalPokemon = pokemonList.length;

    console.log(`Found ${totalPokemon} Pokemon to process`);

    const allPokemonData = [];
    const errors = [];

    for (let i = 0; i < totalPokemon; i++) {
      const pokemon = pokemonList[i];
      console.log(`Processing ${i + 1}/${totalPokemon}: ${pokemon.name}`);

      try {
        const pokemonEntry =
          await this.createComprehensivePokemonEntry(pokemon);

        if (pokemonEntry) {
          allPokemonData.push(pokemonEntry);

          // Save individual file
          await fs.writeFile(
            path.join(OUTPUT_DIR, "individual", `${pokemonEntry.id}.json`),
            JSON.stringify(pokemonEntry, null, 2),
          );

          console.log(`✅ Successfully processed ${pokemon.name}`);
        }
      } catch (error) {
        console.error(`❌ Failed to process ${pokemon.name}:`, error.message);
        errors.push({ pokemon: pokemon.name, error: error.message });
      }

      // Save progress every 50 Pokemon
      if ((i + 1) % 50 === 0) {
        await this.saveProgress(allPokemonData, errors);
        console.log(`Progress saved: ${i + 1}/${totalPokemon} completed`);
      }
    }

    // Final save
    await this.saveProgress(allPokemonData, errors);

    console.log(`\n🎉 Scraping completed!`);
    console.log(`✅ Successfully processed: ${allPokemonData.length} Pokemon`);
    console.log(`❌ Errors: ${errors.length}`);

    if (errors.length > 0) {
      console.log("\nErrors:");
      errors.forEach((error) =>
        console.log(`- ${error.pokemon}: ${error.error}`),
      );
    }

    return { allPokemonData, errors };
  }

  async saveProgress(allPokemonData, errors) {
    // Save complete dataset
    await fs.writeFile(
      path.join(OUTPUT_DIR, "complete-pokedex.json"),
      JSON.stringify(allPokemonData, null, 2),
    );

    // Save errors log
    await fs.writeFile(
      path.join(OUTPUT_DIR, "errors.json"),
      JSON.stringify(errors, null, 2),
    );

    // Create index file for quick lookups
    const index = allPokemonData.map((pokemon) => ({
      id: pokemon.id,
      name: pokemon.name,
      types: pokemon.types.map((t) => t.type.name),
      generation: pokemon.species_info.generation,
      is_legendary: pokemon.species_info.is_legendary,
      is_mythical: pokemon.species_info.is_mythical,
    }));

    await fs.writeFile(
      path.join(OUTPUT_DIR, "pokemon-index.json"),
      JSON.stringify(index, null, 2),
    );
  }
}

export default PokemonScraper;
