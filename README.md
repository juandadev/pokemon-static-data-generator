# Pokémon Static Data Generator

A comprehensive solution for scraping Pokémon data from PokéAPI and generating static, customizable datasets for your
applications.

## 🚀 Features

- **Complete Pokémon Data Scraping**: Fetches all Pokémon, species, and evolution chain data
- **Custom Data Injection**: Add your own sprites, descriptions, stats, and metadata
- **Individual JSON Files**: Each Pokémon gets its own optimized JSON file
- **Development Mode**: Quick scraping for the first 151 Pokémon during development
- **Image Optimization**: Automatic WebP conversion and resizing
- **Data Validation**: Built-in validation to ensure data integrity
- **TypeScript Ready**: Fully typed data structures

## 📁 Project Structure

```txt
pokemon-static-data-generator/
├── scripts/
│   ├── pokemon-scraper.js          # Core scraping logic
│   ├── scrape-pokemon.js           # Full scraping script
│   ├── dev-scrape.js               # Development scraping (151 Pokemon)
│   ├── generate-custom-data.js     # Custom data template generator
│   ├── validate-data.js            # Data validation script
│   ├── optimize-images.js          # Image optimization
│   └── update-pokemon.js           # Update specific Pokemon
├── custom-pokemon-data/
│   ├── custom-data.json            # Your custom Pokemon data
│   └── template.json               # Template for custom data
└── pokemon-data/                   # Raw scraped data
    ├── individual/                 # Individual Pokemon JSON files
    ├── complete-pokedex.json       # Complete dataset
    ├── pokemon-index.json          # Quick lookup index
    └── errors.json                 # Scraping errors log
```
