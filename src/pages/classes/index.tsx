import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useStore } from '@/hooks/useStore';
import { load } from '@/external/bot-skeleton';
import { localize } from '@deriv-com/translations';
import { DBOT_TABS } from '@/constants/bot-contents';
import { LabelPairedPlayCaptionBoldIcon } from '@deriv/quill-icons/LabelPaired';
import './classes.scss';

const CLASSES_DATA = [
    {
        id: '1',
        title: 'How to Load and Use Mesoflix Bots',
        description: 'Watch this quick tutorial to understand how to load our premium bots and start your trading journey. This example uses the Wizard Strategy bot.',
        youtubeUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ', // Example video
        botName: 'Deriv wizard 1', // This matches public/bots/Deriv wizard 1.xml
    },
];

const ClassCard = ({ item, handleLoadBot }: { item: typeof CLASSES_DATA[0], handleLoadBot: (name: string) => void }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div className='class-card'>
            <div className='video-container'>
                <iframe
                    src={item.youtubeUrl}
                    title={item.title}
                    allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'
                    allowFullScreen
                />
            </div>
            <div className='class-info'>
                <h3>{item.title}</h3>
                {isExpanded && <p>{item.description}</p>}
                <button 
                    className='read-more-btn' 
                    onClick={() => setIsExpanded(!isExpanded)}
                >
                    {isExpanded ? localize('Read less') : localize('Read more')}
                </button>
                <button 
                    className='bot-button' 
                    onClick={() => handleLoadBot(item.botName)}
                >
                    <LabelPairedPlayCaptionBoldIcon />
                    {localize('Load {{botName}}', { botName: item.botName })}
                </button>
            </div>
        </div>
    );
};

const Classes = observer(() => {
    const { dashboard } = useStore();
    const { setActiveTab } = dashboard;

    const handleLoadBot = async (botName: string) => {
        try {
            const response = await fetch(`/bots/${encodeURIComponent(botName)}.xml`);
            if (!response.ok) {
                throw new Error('Bot file not found');
            }
            const xmlText = await response.text();
            
            // Switch to Bot Builder tab first
            setActiveTab(DBOT_TABS.BOT_BUILDER);

            // Load the bot into the workspace
            setTimeout(async () => {
                await load({
                    block_string: xmlText,
                    file_name: botName,
                    workspace: window.Blockly.derivWorkspace,
                    from: 'local',
                    drop_event: null,
                    strategy_id: null,
                    showIncompatibleStrategyDialog: false,
                });
            }, 100);

        } catch (error) {
            console.error('Failed to load bot:', error);
        }
    };

    return (
        <div className='classes-page'>
            <div className='classes-header'>
                <h1>{localize('Mesoflix Classes')}</h1>
                <p>{localize('Master our elite trading strategies.')}</p>
            </div>

            <div className='classes-grid'>
                {CLASSES_DATA.map((item) => (
                    <ClassCard key={item.id} item={item} handleLoadBot={handleLoadBot} />
                ))}
            </div>
        </div>
    );
});

export default Classes;
