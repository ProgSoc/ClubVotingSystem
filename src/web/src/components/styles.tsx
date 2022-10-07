import { twMerge } from 'tailwind-merge';

type BaseProps<T = {}> = React.PropsWithChildren<T> & {
  className?: string;
};

export const PageContainer = ({ children, className }: BaseProps) => (
  <div className={twMerge('flex flex-col items-center justify-center text-center h-full w-screen p-8', className)}>
    {children}
  </div>
);

export const AdminPageContainer = ({ children, className }: BaseProps) => (
  <div className={twMerge('flex flex-col items-center text-center h-full w-screen p-8', className)}>{children}</div>
);

export const Heading = ({ children, className }: BaseProps) => (
  <h1 className={twMerge('text-4xl font-bold', className)}>{children}</h1>
);

const SmallLoadingSpinner = ({ children, className }: BaseProps) => (
  <svg className={twMerge('animate-spin h-5 w-5', className)} viewBox="0 0 24 24">
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      fill="transparent"
      stroke="currentColor"
      strokeWidth="4"
    ></circle>
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    ></path>
  </svg>
);

type HTMLButtonProps = React.DetailedHTMLProps<React.ButtonHTMLAttributes<HTMLButtonElement>, HTMLButtonElement>;
type ButtonProps = HTMLButtonProps & {
  isLoading?: boolean;
  loadingText?: string;
};

export const Button = ({ children, className, isLoading, loadingText, ...props }: BaseProps<ButtonProps>) => (
  <button {...props} className={twMerge('btn btn-primary', className)}>
    {!isLoading ? (
      children
    ) : loadingText ? (
      <>
        <SmallLoadingSpinner className="mr-3" />
        {loadingText}
      </>
    ) : (
      <span className="relative">
        <span className="opacity-0">{children}</span>
        <div className="absolute inset-0 flex items-center justify-center">
          <SmallLoadingSpinner />
        </div>
      </span>
    )}
  </button>
);
