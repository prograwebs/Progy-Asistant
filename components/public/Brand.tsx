import Link from "next/link";

type BrandProps = {
  href?: string;
  className?: string;
  showCompany?: boolean;
  companyLabel?: string;
  ariaLabel?: string;
};

export function Brand({ href = "/", className = "brand", showCompany = true, companyLabel = "por Prograwebs", ariaLabel = "Progy, inicio" }: BrandProps) {
  const content = (
    <>
      <span className="brand-copy">
        <span className="brand-heading">
          <span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>
          <span>Progy</span>
        </span>
        {showCompany && <small>{companyLabel}</small>}
      </span>
    </>
  );

  return href ? <Link className={className} href={href} aria-label={ariaLabel}>{content}</Link> : <span className={className}>{content}</span>;
}
