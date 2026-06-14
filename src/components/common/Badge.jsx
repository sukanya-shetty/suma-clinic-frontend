import React from 'react';
import styles from './Badge.module.css';

const Badge = ({ text, type = 'primary' }) => {
  const badgeClass = styles[type] || styles.primary;

  return (
    <span className={`${styles.badge} ${badgeClass}`}>
      {text}
    </span>
  );
};

export default Badge;
