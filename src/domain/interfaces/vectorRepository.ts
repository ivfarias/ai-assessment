export interface IVectorResult {
  text: string;
  score: number;
}

export interface IVectorRepository {
  searchSimilar(vector: number[], limit?: number): Promise<IVectorResult[]>;
}
