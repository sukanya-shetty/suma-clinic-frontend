import React from 'react';
import styles from './StatCard.module.css';

const StatCard = ({ title, value, icon, color = 'var(--primary)', onClick, style }) => {
  // Derive transparent background color from primary, warning, danger, success etc.
  const bgOpacityColor = color.startsWith('var(')
    ? `rgba(21, 101, 192, 0.1)` // default fallback matching primary-bg
    : color;

  return (
    <div className={styles.statCard} onClick={onClick} style={{ ...style, cursor: onClick ? 'pointer' : undefined }}>
      <div className={styles.content}>
        <span className={styles.title}>{title}</span>
        <span className={styles.value}>{value}</span>
      </div>
      
      {icon && (
        <div 
          className={styles.iconWrapper} 
          style={{ backgroundColor: 'var(--primary-bg)', color: color }}
        >
          {icon}
        </div>
      )}
    </div>
  );
};

export default StatCard;
