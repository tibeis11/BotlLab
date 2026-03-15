import { IRecipeParser, ParsedRecipe } from './types';
import { BeerXmlParser } from './beerxml';
import { BeerJsonParser } from './beerjson';
import { MMuMJsonParser } from './mmumjson';

export * from './types';
export * from './utils';

export class RecipeImportService {
  private parsers: IRecipeParser[];

  constructor() {
    this.parsers = [
      new BeerJsonParser(),
      new MMuMJsonParser(),
      new BeerXmlParser()
      // Hier könnten später weitere Formate wie "Brewfather CSV" hinzugefügt werden.
    ];
  }

  /**
   * Nimmt einen rohenDatei-String und parst die Rezepte in unser standardisiertes Format.
   */
  public parseFileContent(content: string): ParsedRecipe[] {
    const parser = this.parsers.find(p => p.canParse(content));
    
    if (!parser) {
      throw new Error('Unbekanntes Dateiformat. Der Inhalt konnte weder als BeerXML noch als BeerJSON identifiziert werden.');
    }

    try {
      return parser.parse(content);
    } catch (e: any) {
      throw new Error(`Fehler beim Parsen der Datei: ${e.message}`);
    }
  }
}
