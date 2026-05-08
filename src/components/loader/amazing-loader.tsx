import React, { useState, useEffect } from 'react';
import { localize } from '@deriv-com/translations';
import './amazing-loader.scss';

interface AmazingLoaderProps {
    message?: string;
    onSkip?: () => void;
}

const AmazingLoader: React.FC<AmazingLoaderProps> = ({ message, onSkip }) => {
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        const duration = 2000; // 2 seconds
        const intervalTime = 30; // ms
        const increment = 100 / (duration / intervalTime);

        const timer = setInterval(() => {
            setProgress(prev => {
                if (prev >= 100) {
                    clearInterval(timer);
                    return 100;
                }
                const nextVal = prev + increment + Math.random() * 1.5;
                return nextVal >= 100 ? 100 : nextVal;
            });
        }, intervalTime);

        return () => {
            clearInterval(timer);
        };
    }, []);

    return (
        <div className='amazing-loader'>
            <div className='amazing-loader__background'>
                <div className='amazing-loader__aurora amazing-loader__aurora--1'></div>
                <div className='amazing-loader__aurora amazing-loader__aurora--2'></div>
                <div className='amazing-loader__aurora amazing-loader__aurora--3'></div>
                <div className='amazing-loader__grid-overlay'></div>
            </div>

            <div className='amazing-loader__container'>
                <div className='amazing-loader__glass-card'>
                    <div className='amazing-loader__logo-section'>
                        <div className='amazing-loader__brand-mark'>
                            <span className='amazing-loader__o-letter'>Q</span>
                            <div className='amazing-loader__ring'></div>
                            <div className='amazing-loader__ring amazing-loader__ring--outer'></div>
                            <div className='amazing-loader__scan-line'></div>
                        </div>
                    </div>

                    <div className='amazing-loader__content'>
                        <div className='amazing-loader__brand-wrapper'>
                            <h2 className='amazing-loader__brand-name'>TRADQ</h2>
                            <span className='amazing-loader__brand-suffix'>AI TRADING HUB</span>
                        </div>

                        <div className='amazing-loader__status-container'>
                            <div className='amazing-loader__shimmer-text'>
                                {message || 'Initializing quantum trade engine...'}
                            </div>
                            <div className='amazing-loader__progress-wrapper'>
                                <div
                                    className='amazing-loader__progress-indicator'
                                    style={{ width: `${Math.floor(progress)}%` }}
                                >
                                    <div className='amazing-loader__progress-glow'></div>
                                </div>
                            </div>
                            <div className='amazing-loader__percent-label'>{Math.floor(progress)}%</div>
                            <div className='amazing-loader__security-badge'>
                                <span className='amazing-loader__dot'></span>
                                <span>SSL SECURE CONNECTION</span>
                            </div>
                        </div>
                    </div>
                </div>

                {onSkip && (
                    <button className='amazing-loader__skip-btn' onClick={onSkip}>
                        <span>{localize('Skip Intro')}</span>
                        <svg
                            width='14'
                            height='14'
                            viewBox='0 0 24 24'
                            fill='none'
                            stroke='currentColor'
                            strokeWidth='2.5'
                            strokeLinecap='round'
                            strokeLinejoin='round'
                        >
                            <polyline points='13 17 18 12 13 7'></polyline>
                            <polyline points='6 17 11 12 6 7'></polyline>
                        </svg>
                    </button>
                )}

                <div className='amazing-loader__footer'>
                    <span className='amazing-loader__tagline'>Tradq · AI-Powered Trading Infrastructure</span>
                </div>
            </div>
        </div>
    );
};

export default AmazingLoader;
