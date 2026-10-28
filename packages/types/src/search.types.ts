export type SearchResultType = 'workspace' | 'project' | 'issue' | 'page';

export interface ISearchResult {
  type: SearchResultType;
  id: string;
  name: string;
  context: string | null;
  url: string; // built by the server, so treat it as untrusted
}

export interface ISearchResponse {
  items: ISearchResult[];
}
