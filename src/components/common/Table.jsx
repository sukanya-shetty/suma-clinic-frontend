import React from 'react';
import styles from './Table.module.css';

const Table = ({ headers, data, renderRow, keyField = 'id', emptyMessage = 'No data available' }) => {
  const safeData = Array.isArray(data) ? data : [];
  return (
    <div className={styles.tableContainer}>
      <table className={styles.table}>
        <thead>
          <tr>
            {headers.map((h, idx) => (
              <th key={h.key || idx} style={h.style || {}}>
                {h.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {safeData.length === 0 ? (
            <tr>
              <td colSpan={headers.length} className={styles.emptyState}>
                {emptyMessage}
              </td>
            </tr>
          ) : renderRow ? (
            safeData.map((item, idx) => renderRow(item, idx))
          ) : (
            safeData.map((item, idx) => (
              <tr key={item[keyField] || idx}>
                {headers.map((h) => (
                  <td key={h.key}>
                    {item[h.key] !== undefined && item[h.key] !== null ? String(item[h.key]) : '-'}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default Table;
