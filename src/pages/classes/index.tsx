import { useState, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { useStore } from '@/hooks/useStore';
import { load } from '@/external/bot-skeleton';
import { localize } from '@deriv-com/translations';
import { DBOT_TABS } from '@/constants/bot-contents';
import { LabelPairedPlayCaptionBoldIcon } from '@deriv/quill-icons/LabelPaired';
import './classes.scss';

const ClassCard = ({ item, handleLoadBot }: { item: any; handleLoadBot: (name: string) => Promise<void> }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div className='class-card'>
            {item.youtubeUrl ? (
                <div className='video-container'>
                    <iframe
                        src={item.youtubeUrl}
                        title={item.title}
                        allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'
                        allowFullScreen
                    />
                </div>
            ) : (
                <div className='bot-preview-container'>
                    <div className='bot-icon-large'>
                        <LabelPairedPlayCaptionBoldIcon />
                    </div>
                </div>
            )}
            <div className='class-info'>
                <h3>{item.title}</h3>
                {isExpanded && <p>{item.description}</p>}
                <button className='read-more-btn' onClick={() => setIsExpanded(!isExpanded)}>
                    {isExpanded ? localize('Read less') : localize('Read more')}
                </button>
                {(item.botName || item.fileName) && (
                    <button className='bot-button' onClick={() => handleLoadBot(item.botName || item.fileName)}>
                        <LabelPairedPlayCaptionBoldIcon />
                        {localize('Load {{botName}}', { botName: item.botName || item.fileName })}
                    </button>
                )}
            </div>
        </div>
    );
};

const Classes = observer(() => {
    const { dashboard } = useStore();
    const { setActiveTab } = dashboard;
    const [videos, setVideos] = useState<any[]>([]);
    const [bots, setBots] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchClasses = async () => {
            try {
                // Fetch the repo-synced classes registry
                const pathsToTry = ['/public/bots/classes.json', '/bots/classes.json', '/classes.json'];
                let found = false;

                for (const path of pathsToTry) {
                    if (found) break;
                    try {
                        const response = await fetch(path);
                        if (response.ok) {
                            const data = await response.json();
                            if (data.videos || data.bots) {
                                setVideos(data.videos || []);
                                setBots(data.bots || []);
                                found = true;
                            }
                        }
                    } catch (e) {
                        // Continue to next path
                    }
                }
            } catch (error) {
                console.error('Failed to sync repo classes:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchClasses();
    }, []);

    const handleLoadBot = async (botName: string) => {
        try {
            const paths = [`/bots/${botName}.xml`, `/public/bots/${botName}.xml`, `/${botName}.xml`].map(p =>
                encodeURI(p)
            );
            let xmlText = '';

            for (const path of paths) {
                const res = await fetch(path);
                if (res.ok) {
                    xmlText = await res.text();
                    break;
                }
            }

            if (!xmlText) throw new Error('Bot strategy not found in repository');

            setActiveTab(DBOT_TABS.BOT_BUILDER);
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
                <h1>{localize('Tradq Academy')}</h1>
                <p>{localize('Master our elite trading strategies with repo-synced institutional classes.')}</p>
            </div>

            {loading ? (
                <div className='flex justify-center items-center py-20'>
                    <div className='animate-pulse text-red-500 font-black uppercase tracking-widest text-sm'>
                        Syncing Repository...
                    </div>
                </div>
            ) : (
                <div className='classes-grid'>
                    {videos.map((item: any) => (
                        <ClassCard key={item.id} item={item} handleLoadBot={handleLoadBot} />
                    ))}
                    {bots.map((item: any) => (
                        <ClassCard key={item.id || item.fileName} item={item} handleLoadBot={handleLoadBot} />
                    ))}
                    {videos.length === 0 && bots.length === 0 && (
                        <div className='col-span-full py-20 text-center opacity-30 italic font-bold'>
                            {localize('No classes or bots found in the repository registry.')}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
});

export default Classes;
