import React, { useState, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { motion, AnimatePresence } from 'framer-motion';
import classNames from 'classnames';
import { localize } from '@deriv-com/translations';
import './campaigns.scss';

const Campaigns = observer(() => {
    const [active_sub_tab, setActiveSubTab] = useState<'promotions' | 'booking'>('promotions');
    const [promotions, setPromotions] = useState<any[]>([]);

    const defaultPromotions = [
        {
            id: 1,
            title: 'HFT Wizard V2',
            desc: 'High-Frequency Trading Protocol with 92% accuracy. Limited slots available for institutional access.',
            image: '/campaigns/hft_wizard.png',
            badge: 'Limited Offer',
            link: '#/freebots',
        },
        {
            id: 2,
            title: 'AI Smart Alpha',
            desc: 'Neural-network driven market sentiment analysis. Join the revolution of automated intelligence.',
            image: '/campaigns/ai_smart_alpha.png',
            badge: 'AI Exclusive',
            link: '#/ai-hub',
        },
        {
            id: 3,
            title: 'Live Mentorship',
            desc: 'Professional 1-on-1 coaching sessions. Scale your account with expert guidance.',
            image: '/campaigns/live_mentorship.png',
            badge: 'Coaching',
            link: '#/classes',
        },
    ];

    useEffect(() => {
        fetch('/campaigns/campaigns.json')
            .then(res => {
                if (!res.ok) throw new Error();
                return res.json();
            })
            .then(data => {
                if (Array.isArray(data) && data.length > 0) {
                    setPromotions(data);
                } else {
                    setPromotions(defaultPromotions);
                }
            })
            .catch(() => {
                setPromotions(defaultPromotions);
            });
    }, []);

    // Booking Form State
    const [bookingData, setBookingData] = useState({
        name: '',
        phone: '',
        hasFunds: false,
    });

    const handleBookingSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const { name, phone, hasFunds } = bookingData;
        if (!name || !phone || !hasFunds) return;

        const message = `Hi I am ${name}, I have the 100 dollars and I am ready for a live trading session, give me the way forward.`;
        const whatsapp_url = `https://wa.me/254793632071?text=${encodeURIComponent(message)}`;
        window.open(whatsapp_url, '_blank');
    };

    return (
        <div className='campaigns-page'>
            <video autoPlay loop muted playsInline className='campaigns-page__video-bg'>
                <source
                    src='https://assets.mixkit.co/videos/preview/mixkit-financial-data-scrolling-on-a-monitor-4344-large.mp4'
                    type='video/mp4'
                />
            </video>
            <div className='campaigns-page__overlay' />

            <nav className='campaigns-nav'>
                <button
                    className={classNames('campaigns-nav__btn', {
                        'campaigns-nav__btn--active': active_sub_tab === 'promotions',
                    })}
                    onClick={() => setActiveSubTab('promotions')}
                >
                    {localize('Promotions')}
                </button>
                <button
                    className={classNames('campaigns-nav__btn', {
                        'campaigns-nav__btn--active': active_sub_tab === 'booking',
                    })}
                    onClick={() => setActiveSubTab('booking')}
                >
                    {localize('Book a Live Session')}
                </button>
            </nav>

            <AnimatePresence exitBeforeEnter>
                {active_sub_tab === 'promotions' ? (
                    <motion.div
                        key='promotions'
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.4 }}
                        className='promotions-content'
                    >
                        {promotions.map(promo => (
                            <div
                                key={promo.id}
                                className='promo-card'
                                onClick={() => (window.location.hash = promo.link)}
                            >
                                <div className='promo-card__bg' style={{ backgroundImage: `url(${promo.image})` }} />
                                <div className='promo-card__content'>
                                    <span className='promo-card__badge'>{promo.badge}</span>
                                    <h3 className='promo-card__title'>{promo.title}</h3>
                                    <p className='promo-card__desc'>{promo.desc}</p>
                                    <div className='promo-card__btn'>{localize('View Details')}</div>
                                </div>
                            </div>
                        ))}
                    </motion.div>
                ) : (
                    <motion.div
                        key='booking'
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.4 }}
                        className='booking-content'
                    >
                        <h2>{localize('Book a Live Session')}</h2>
                        <div className='booking-requirements'>
                            <p>
                                {localize('Join our exclusive live trading sessions. ')}
                                <strong>{localize('Requirements: ')}</strong>
                                {localize('Minimum of $100 account balance and a stable internet connection.')}
                            </p>
                        </div>

                        <form className='booking-form' onSubmit={handleBookingSubmit}>
                            <div className='booking-form__field'>
                                <label>{localize('Full Name')}</label>
                                <input
                                    type='text'
                                    placeholder={localize('Enter your name')}
                                    value={bookingData.name}
                                    onChange={e => setBookingData({ ...bookingData, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div className='booking-form__field'>
                                <label>{localize('WhatsApp Number')}</label>
                                <input
                                    type='tel'
                                    placeholder={localize('+254...')}
                                    value={bookingData.phone}
                                    onChange={e => setBookingData({ ...bookingData, phone: e.target.value })}
                                    required
                                />
                            </div>
                            <label className='booking-form__checkbox'>
                                <input
                                    type='checkbox'
                                    checked={bookingData.hasFunds}
                                    onChange={e => setBookingData({ ...bookingData, hasFunds: e.target.checked })}
                                    required
                                />
                                <span>
                                    {localize(
                                        'I confirm that I have a minimum of $100 and I am ready for a live trading session.'
                                    )}
                                </span>
                            </label>

                            <button
                                type='submit'
                                className='booking-form__submit'
                                disabled={!bookingData.name || !bookingData.phone || !bookingData.hasFunds}
                            >
                                <span>{localize('Book Now')}</span>
                            </button>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
});

export default Campaigns;
