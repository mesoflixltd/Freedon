import React from 'react';
import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import Text from '@/components/shared_ui/text';
import { useStore } from '@/hooks/useStore';
import { LabelPairedChevronDownMdFillIcon, LabelPairedChevronRightMdFillIcon } from '@deriv/quill-icons/LabelPaired';
import { localize } from '@deriv-com/translations';
import { useDevice } from '@deriv-com/ui';
import ToolbarButton from '../toolbar/toolbar-button';
import SearchBox from './search-box';
import { ToolboxItems } from './toolbox-items';
import './toolbox.scss';

const Toolbox = observer(() => {
    const { isDesktop } = useDevice();
    const { toolbox, flyout, quick_strategy, run_panel, client } = useStore();
    const {
        is_search_loading,
        onMount,
        onSearchBlur,
        onSearchClear,
        onSearchKeyUp,
        onUnmount,
        getAllCategories,
        onToolboxItemClick,
        sub_category_index,
    } = toolbox;
    const { setFormVisibility } = quick_strategy;
    const { setVisibility, selected_category } = flyout;

    const toolbox_ref = React.useRef(ToolboxItems());
    const [is_open, setOpen] = React.useState(true);

    React.useEffect(() => {
        onMount(toolbox_ref);
        return () => onUnmount();
    }, []);

    const handleQuickStrategyOpen = () => {
        setFormVisibility(true);
    };

    if (!isDesktop) return null;

    const all_categories = getAllCategories();

    return (
        <div className='db-toolbox' data-testid='dashboard__toolbox'>
            <div className='db-toolbox__buttons'>
                <ToolbarButton
                    popover_message={localize('Click here to start building your Deriv Bot.')}
                    button_id='db-toolbar__get-started-button'
                    button_classname='toolbar__btn toolbar__btn--icon toolbar__btn--start'
                    buttonOnClick={handleQuickStrategyOpen}
                    button_text={localize('Quick strategy')}
                />
                {client.is_virtual && (
                    <ToolbarButton
                        popover_message={localize('Duplicate trades from Demo to Real in realtime.')}
                        button_id='db-toolbar__copytrading-button'
                        button_classname={classNames('toolbar__btn toolbar__btn--icon', {
                            'toolbar__btn--stop': run_panel.is_copy_trading,
                            'toolbar__btn--start': !run_panel.is_copy_trading,
                        })}
                        buttonOnClick={() => run_panel.setIsCopyTrading(!run_panel.is_copy_trading)}
                        button_text={run_panel.is_copy_trading ? localize('Stop Demo to Real') : localize('Start Demo to Real')}
                    />
                )}
            </div>
            <div className='db-toolbox__content'>
                <div className='db-toolbox__header'>
                    <div
                        className='db-toolbox__title'
                        data-testid='db-toolbox__title'
                        onClick={() => {
                            setOpen(!is_open);
                            setVisibility(false);
                        }}
                    >
                        <Text weight='bold' size='s'>
                            {localize('Blocks menu')}
                        </Text>
                        <span
                            className={classNames('db-toolbox__title__chevron', {
                                'db-toolbox__title__chevron--active': is_open,
                            })}
                        >
                            <LabelPairedChevronDownMdFillIcon fill='var(--text-general)' />
                        </span>
                    </div>
                </div>

                <div className={classNames('db-toolbox__content-wrapper', { active: is_open })}>
                    <SearchBox
                        is_search_loading={is_search_loading}
                        onSearch={toolbox.onSearch}
                        onSearchBlur={onSearchBlur}
                        onSearchClear={onSearchClear}
                        onSearchKeyUp={onSearchKeyUp}
                    />
                    <div className='db-toolbox__category-menu'>
                        {all_categories.map((category: any, index: number) => {
                            const is_sub_category = sub_category_index.includes(index);
                            const category_name = category.getAttribute('name');
                            const category_id = category.getAttribute('id');
                            const is_selected = selected_category?.getAttribute('id') === category_id;

                            return (
                                <div
                                    key={`${category_id}-${index}`}
                                    className={classNames('db-toolbox__row', {
                                        'db-toolbox__row--active': is_selected,
                                        'db-toolbox__sub-category': is_sub_category,
                                    })}
                                    onClick={() => onToolboxItemClick(category)}
                                >
                                    <div className='db-toolbox__category-text'>
                                        <Text
                                            size='xs'
                                            weight={is_selected ? 'bold' : 'normal'}
                                            color={is_selected ? 'prominent' : 'general'}
                                        >
                                            {category_name}
                                        </Text>
                                        {!is_sub_category && (
                                            <LabelPairedChevronRightMdFillIcon fill='var(--text-general)' />
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
            {/* Hidden Blockly injection point */}
            <div style={{ display: 'none' }} id='gtm-toolbox' />
        </div>
    );
});

export default Toolbox;
