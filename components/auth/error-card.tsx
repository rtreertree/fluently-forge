import { ExclamationTriangleIcon } from '@radix-ui/react-icons';
import { CardWrapper } from './card-wrapper';


export const ErrorCard = () => {
    return (
        <CardWrapper headerLabel='Something went wrong' backButtonLabel='Back to login' backButtonHref='/auth/login'>
            <div className='w-full items-center flex justify-center'>
                <ExclamationTriangleIcon className="text-destructive"/>
            </div>
        </CardWrapper>
    );
};