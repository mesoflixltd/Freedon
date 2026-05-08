import React from 'react';
import { useNavigate } from 'react-router-dom';
import { localize } from '@deriv-com/translations';
import './selection-page.scss';

const SelectionPage = () => {
    const navigate = useNavigate();

    const handleLegacyClick = () => {
        const appId = process.env.APP_ID || '114343';
        window.location.href = `https://oauth.deriv.com/oauth?app_id=${appId}&l=EN`;
    };

    const handleNewV2Click = async () => {
        try {
            const { generateOAuthURL } = await import('@/components/shared/utils/config/config');
            const oauthUrl = await generateOAuthURL();
            if (oauthUrl) {
                window.location.href = oauthUrl;
            } else {
                console.error('Failed to generate OAuth URL for V2');
            }
        } catch (error) {
            console.error('Failed to redirect to V2 OAuth:', error);
        }
    };


    return (
        <div className="selection-page">
            <div className="selection-page__container">
                <header className="selection-page__header">
                    <h1 className="selection-page__title">Mesoflix</h1>
                    <p className="selection-page__subtitle">
                        {localize('Please select your Deriv account type to continue')}
                    </p>
                </header>

                <div className="selection-page__choices">
                    <div className="selection-card" onClick={handleLegacyClick}>
                        <div className="selection-card__icon selection-card__icon--legacy">
                            <span className="icon-legacy">L</span>
                        </div>
                        <h2 className="selection-card__title">{localize('Legacy Account')}</h2>
                        <p className="selection-card__description">
                            {localize('Access the original trading platform and legacy bots.')}
                        </p>
                        <button className="selection-card__button selection-card__button--legacy">
                            {localize('Go to Legacy')}
                        </button>
                    </div>

                    <div className="selection-card" onClick={handleNewV2Click}>
                        <div className="selection-card__icon selection-card__icon--v2">
                            <span className="icon-v2">V2</span>
                        </div>
                        <h2 className="selection-card__title">{localize('New Account V2')}</h2>
                        <p className="selection-card__description">
                            {localize('Experience the next generation trading hub with advanced features.')}
                        </p>
                        <button className="selection-card__button selection-card__button--v2">
                            {localize('Open V2 Hub')}
                        </button>
                    </div>
                </div>

                <footer className="selection-page__footer">
                    <p>&copy; {new Date().getFullYear()} Mesoflix. All rights reserved.</p>
                </footer>
            </div>
        </div>
    );
};

export default SelectionPage;
