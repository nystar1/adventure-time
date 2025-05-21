import Link from 'next/link';
import styles from '@/styles/Breadcrumbs.module.css';

export default function Breadcrumbs({ items }) {
  return (
    <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
      <ol>
        {items.map((item, index) => (
          <li key={index}>
            {index < items.length - 1 ? (
              <>
                <Link href={item.href}>{item.label}</Link>
                <span className={styles.separator}>/</span>
              </>
            ) : (
              <span aria-current="page">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
} 