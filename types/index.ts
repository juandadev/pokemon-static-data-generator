export type PokemonTypes =
  | "normal"
  | "fire"
  | "water"
  | "electric"
  | "grass"
  | "ice"
  | "fighting"
  | "poison"
  | "ground"
  | "flying"
  | "psychic"
  | "bug"
  | "rock"
  | "ghost"
  | "dragon"
  | "dark"
  | "steel"
  | "fairy";

export interface GenericPropertyDetails<T = string> {
  name: T;
  url: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: number;
  previous: number;
  results: T[];
}
