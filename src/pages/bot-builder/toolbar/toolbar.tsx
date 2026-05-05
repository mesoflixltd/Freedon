import React from 'react';
import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import Dialog from '@/components/shared_ui/dialog';
import { useStore } from '@/hooks/useStore';
import { Localize, localize } from '@deriv-com/translations';
import { useDevice } from '@deriv-com/ui';
import ToolbarButton from './toolbar-button';
import WorkspaceGroup from './workspace-group';

const Toolbar = observer(() => {
    const { toolbar, quick_strategy, client, run_panel } = useStore();
    const { isDesktop } = useDevice();
    const { is_dialog_open, closeResetDialog, onResetOkButtonClick: onOkButtonClick } = toolbar;
    const { is_running } = run_panel;
    const { setFormVisibility } = quick_strategy;
    const confirm_button_text = is_running ? localize('Yes') : localize('OK');
    const cancel_button_text = is_running ? localize('No') : localize('Cancel');
    
    const handleQuickStrategyOpen = () => {
        setFormVisibility(true);
    };

    const handleLogin = () => {
        // No-op for this dialog
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
                                    is_bot_running={run_panel.is_running}
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
                login={handleLogin}
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
