import React from 'react';
import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import Dialog from '@/components/shared_ui/dialog';
import { useStore } from '@/hooks/useStore';
import { Localize, localize } from '@deriv-com/translations';
import { useDevice } from '@deriv-com/ui';
/* [AI] - Analytics event tracking removed - see migrate-docs/MONITORING_PACKAGES.md for re-implementation guide */
/* [/AI] */
import ToolbarButton from './toolbar-button';
import WorkspaceGroup from './workspace-group';

const Toolbar = observer(() => {
    const { run_panel, toolbar, quick_strategy, client } = useStore();
    const { isDesktop } = useDevice();
    const { is_dialog_open, closeResetDialog, onResetOkButtonClick: onOkButtonClick } = toolbar;
    const { is_running, is_copy_trading, setIsCopyTrading } = run_panel;
    const { is_virtual } = client;
    const { setFormVisibility } = quick_strategy;
    const confirm_button_text = is_running ? localize('Yes') : localize('OK');
    const cancel_button_text = is_running ? localize('No') : localize('Cancel');
    const handleQuickStrategyOpen = () => {
        setFormVisibility(true);
        /* [AI] - Analytics event tracking removed - see migrate-docs/MONITORING_PACKAGES.md for re-implementation guide */
        /* [/AI] */
    };
    return (
        <React.Fragment>
            <div className='toolbar dashboard__toolbar' data-testid='dt_dashboard_toolbar'>
                <div className='toolbar__section'>
                    {!isDesktop && (
                        <div className='toolbar__mobile-buttons'>
                            <ToolbarButton
                                popover_message={localize('Click here to start building your Deriv Bot.')}
                                button_id='db-toolbar__get-started-button'
                                button_classname='toolbar__btn toolbar__btn--icon toolbar__btn--start'
                                buttonOnClick={handleQuickStrategyOpen}
                                button_text={localize('Quick strategy')}
                                is_bot_running={is_running}
                            />
                            {is_virtual && (
                                <ToolbarButton
                                    popover_message={localize('Duplicate trades from Demo to Real in realtime.')}
                                    button_id='db-toolbar__copytrading-button'
                                    button_classname={classNames('toolbar__btn toolbar__btn--icon', {
                                        'toolbar__btn--stop': is_copy_trading,
                                        'toolbar__btn--start': !is_copy_trading,
                                    })}
                                    buttonOnClick={() => setIsCopyTrading(!is_copy_trading)}
                                    button_text={is_copy_trading ? localize('Stop Demo to Real') : localize('Start Demo to Real')}
                                    is_bot_running={is_running}
                                />
                            )}
                        </div>
                    )}
                    {isDesktop && <WorkspaceGroup />}
                </div>
            </div>
            {!isDesktop && <WorkspaceGroup />}
            <Dialog
                portal_element_id='modal_root'
                title={localize('Are you sure?')}
                is_visible={is_dialog_open}
                confirm_button_text={confirm_button_text}
                onConfirm={onOkButtonClick}
                cancel_button_text={cancel_button_text}
                onCancel={closeResetDialog}
                is_mobile_full_width={false}
                className={'toolbar__dialog'}
                has_close_icon
            >
                {is_running ? (
                    <Localize
                        i18n_default_text='The workspace will be reset to the default strategy and any unsaved changes will be lost. <0>Note: This will not affect your running bot.</0>'
                        components={[
                            <div
                                key={0}
                                className='toolbar__dialog-text--second'
                                data-testid='dt_toolbar_dialog_text_second'
                            />,
                        ]}
                    />
                ) : (
                    <Localize i18n_default_text='Any unsaved changes will be lost.' />
                )}
            </Dialog>
        </React.Fragment>
    );
});

export default Toolbar;
