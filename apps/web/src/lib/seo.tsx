import { useLocation } from 'react-router';
import { SITE_URL } from './utils';

interface SeoProps {
  title: string;
  description: string;
  image?: string;
  /** Set for pages that must not be indexed (admin, confirmations). */
  noindex?: boolean;
}

/**
 * React 19 hoists <title>, <meta> and <link> rendered anywhere in the tree into
 * the document <head>, so each page simply renders <Seo />.
 */
export function Seo({ title, description, image = '/og-image.jpg', noindex }: SeoProps) {
  const { pathname } = useLocation();
  const fullTitle = title.includes('Eden Falls') ? title : `${title} · Eden Falls Resort`;
  const url = `${SITE_URL}${pathname === '/' ? '' : pathname}`;
  const imageUrl = image.startsWith('http') ? image : `${SITE_URL}${image}`;
  return (
    <>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {noindex ? <meta name="robots" content="noindex, nofollow" /> : <link rel="canonical" href={url} />}
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="Eden Falls Resort" />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={imageUrl} />
      <meta name="twitter:card" content="summary_large_image" />
    </>
  );
}
