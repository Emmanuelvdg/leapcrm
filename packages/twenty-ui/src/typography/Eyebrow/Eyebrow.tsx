import { clsx } from 'clsx';

import styles from './Eyebrow.module.scss';

type EyebrowProps = {
  children?: React.ReactNode;
  className?: string;
};

export const Eyebrow = ({ children, className }: EyebrowProps) => {
  return <div className={clsx(styles.eyebrow, className)}>{children}</div>;
};
