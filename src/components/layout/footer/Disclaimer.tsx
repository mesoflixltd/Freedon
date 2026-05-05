import React from 'react';
import { useTranslations } from '@deriv-com/translations';
import { Tooltip } from '@deriv-com/ui';
import { LegacyInfoXsIcon } from '@deriv/quill-icons/Legacy';
import Modal from '@/components/shared_ui/modal';
import Text from '@/components/shared_ui/text';
import Button from '@/components/shared_ui/button';

interface IDisclaimerProps {
    isMobile?: boolean;
}

const Disclaimer = ({ isMobile }: IDisclaimerProps) => {
    const { localize } = useTranslations();
    const [is_modal_open, setModalOpen] = React.useState(false);

    const toggleModal = () => setModalOpen(!is_modal_open);

    const disclaimer_text = (
        <div className='disclaimer__content'>
            <Text as='p' size='xs' lineHeight='s'>
                {localize('Deriv offers complex derivatives, such as options and contracts for difference ("CFDs"). These products may not be suitable for all clients, and trading them puts you at risk.')}
            </Text>
            <br />
            <Text as='p' size='xs' weight='bold' lineHeight='s'>
                {localize('Please ensure you understand these risks:')}
            </Text>
            <ul style={{ paddingLeft: '20px', marginTop: '8px' }}>
                <li>
                    <Text size='xs' lineHeight='s'>{localize('You may lose some or all of your invested capital')}</Text>
                </li>
                <li>
                    <Text size='xs' lineHeight='s'>{localize('Currency conversion affects your profit/loss')}</Text>
                </li>
                <li>
                    <Text size='xs' lineHeight='s'>{localize('Markets can be volatile and unpredictable')}</Text>
                </li>
            </ul>
            <br />
            <Text as='p' size='xs' weight='bold' lineHeight='s'>
                {localize('Important: Never trade with borrowed money or funds you cannot afford to lose.')}
            </Text>
            <br />
            <Text as='p' size='xs' lineHeight='s'>
                {localize('By continuing, you confirm that you understand these risks and that you are aware that Deriv does not provide investment advice.')}
            </Text>
        </div>
    );

    if (isMobile) {
        return (
            <>
                <Button
                    id='db-disclaimer-button-mobile'
                    className='disclaimer__button-mobile'
                    onClick={toggleModal}
                    has_effect
                    secondary
                    small
                >
                    {localize('Disclaimer')}
                </Button>
                <Modal
                    title={localize('Disclaimer')}
                    is_open={is_modal_open}
                    toggleModal={toggleModal}
                    width='440px'
                >
                    <Modal.Body>
                        <div style={{ padding: '1.6rem' }}>
                            {disclaimer_text}
                        </div>
                    </Modal.Body>
                </Modal>
            </>
        );
    }

    return (
        <>
            <Tooltip
                as='button'
                className='app-footer__icon'
                tooltipContent={localize('Disclaimer')}
                onClick={toggleModal}
            >
                <LegacyInfoXsIcon iconSize='sm' />
            </Tooltip>
            <Modal
                title={localize('Disclaimer')}
                is_open={is_modal_open}
                toggleModal={toggleModal}
                width='440px'
            >
                <Modal.Body>
                    <div style={{ padding: '2.4rem' }}>
                        {disclaimer_text}
                    </div>
                </Modal.Body>
            </Modal>
        </>
    );
};

export default Disclaimer;
