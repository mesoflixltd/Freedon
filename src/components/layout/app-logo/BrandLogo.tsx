type TBrandLogoProps = {
    width?: number;
    height?: number;
    fill?: string;
    className?: string;
    isMobile?: boolean;
};

export const BrandLogo = ({
    width = 120,
    height = 32,
    fill = '#6366f1',
    className = '',
    isMobile = false,
}: TBrandLogoProps) => {
    return (
        <div
            className={`brand-logo ${className}`}
            style={{
                display: 'flex',
                alignItems: 'center',
                width: width ? `${width}px` : undefined,
                height: height ? `${height}px` : undefined,
                gap: '10px',
                fontWeight: 800,
                fontSize: isMobile ? '20px' : '22px',
                color: fill,
                letterSpacing: '-0.03em',
                fontFamily: '"Outfit", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            }}
        >
            <div
                style={{
                    width: isMobile ? '30px' : '34px',
                    height: isMobile ? '30px' : '34px',
                    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', // Premium royal indigo/purple gradient
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    fontSize: isMobile ? '16px' : '19px',
                    fontWeight: 900,
                    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.35)',
                    textShadow: '0 1px 2px rgba(0,0,0,0.15)',
                }}
            >
                F
            </div>
            <span style={{ fontWeight: 900, letterSpacing: '-0.02em' }}>Freedon</span>
        </div>
    );
};
