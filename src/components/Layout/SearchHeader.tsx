import { SearchBar } from '../UI/SearchBar';

export function SearchHeader() {
  return (
    <div className="bg-arkade-black border-b border-arkade-purple py-4">
      <div className="container mx-auto px-4">
        <SearchBar />
      </div>
    </div>
  );
}
