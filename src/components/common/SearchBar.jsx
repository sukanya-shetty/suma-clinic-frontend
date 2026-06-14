import React from 'react';
import { Search } from 'lucide-react';
import styles from './SearchBar.module.css';

const SearchBar = ({ placeholder = 'Search...', value, onChange }) => {
  return (
    <div className={styles.searchContainer}>
      <Search size={16} className={styles.searchIcon} />
      <input 
        type="text" 
        className={styles.searchInput}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
};

export default SearchBar;
