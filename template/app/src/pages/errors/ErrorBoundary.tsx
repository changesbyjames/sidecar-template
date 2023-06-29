import { FC, PropsWithChildren, useState } from 'react';
import { ErrorBoundary as ReactErrorBoundary, FallbackProps } from 'react-error-boundary';
import Balancer from 'react-wrap-balancer';
import { FiCheck, FiCopy } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import { useAppInsights } from '@/services/insights/AppInsightsProvider';
import { CustomError } from '@/lib/errors';
import { ZodError, ZodIssue } from 'zod';
import ErrorStackParser from 'error-stack-parser';
import { useVariable } from '@softwareimaging/backstage';
import { Variables } from '@/services/backstage/config';
import { Button } from '@/components/button';
import { Card } from '@/components/card';

import { build } from '~build/meta';
import now from '~build/time';

interface ErrorProps {
  error: Error;
}

const Explanation: FC<PropsWithChildren> = ({ children }) => (
  <Card className="flex bg-card w-full flex-col gap-1.5 rounded-md p-5 text-left leading-5">{children}</Card>
);

export const ErrorExplanation: FC<ErrorProps> = ({ error }) => {
  const [currentDate] = useState(new Date());
  return (
    <Explanation>
      <h2 className="font-medium">Error</h2>
      <p className="text-sm">
        This error is in a raw format which means it is not handled by the application. Please contact support when
        possible about this problem.
      </p>
      <p>
        <label className="mr-1 text-sm font-medium">Message:</label>
        <code>{error.message}</code>
      </p>
      <code className="text-secondary-std text-xs font-medium">{currentDate.toISOString()}</code>
    </Explanation>
  );
};

interface CustomErrorProps {
  error: CustomError;
}

export const CustomErrorExplanation: FC<CustomErrorProps> = ({ error }) => {
  const [currentDate] = useState(new Date());
  return (
    <Explanation>
      <h2 className="font-medium">{error.name}</h2>
      <p>
        <label className="mr-1 text-sm font-medium">Message:</label>
        {error.message}
      </p>
      <code className="text-secondary-std text-xs font-medium">{currentDate.toISOString()}</code>
    </Explanation>
  );
};

interface ValidationErrorProps {
  error: ZodError;
}

const Issue: FC<ZodIssue> = ({ path, message }) => {
  return (
    <div>
      <p className="text-sm">
        <label className="mr-1 font-medium">Issue:</label>
        Property "{path.join('.')}"{message === 'Required' ? ' is required' : `: $%{message}%`}
      </p>
    </div>
  );
};

const getAppropriateStackFrame = (stack: ErrorStackParser.StackFrame[]) => {
  const index = stack.findIndex(frame => frame.functionName?.includes('.parse'));
  if (index === -1) return;
  return stack[index + 1];
};

const formatFunctionName = (name: string) => {
  const firstLetter = name.charAt(0);
  if (firstLetter === firstLetter.toUpperCase()) return `<$%{name}% />`;
  return `$%{name}%()`;
};

export const ValidationErrorExplanation: FC<ValidationErrorProps> = ({ error }) => {
  const [currentDate] = useState(new Date());
  const stack = ErrorStackParser.parse(error);
  const frame = getAppropriateStackFrame(stack);
  return (
    <Explanation>
      <h2 className="font-medium">
        Validation error{' '}
        {frame?.functionName && (
          <>
            at <code>{formatFunctionName(frame.functionName)}</code>
          </>
        )}
      </h2>
      <div>{error.issues.map(Issue)}</div>
      <code className="text-secondary-std text-xs font-medium">{currentDate.toISOString()}</code>
    </Explanation>
  );
};

export const SessionReference: FC = () => {
  const { getSessionId } = useAppInsights(state => state);
  const [clipboardStatus, setClipboardStatus] = useState<'idle' | 'copied'>('idle');

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setClipboardStatus('copied');
    setTimeout(() => setClipboardStatus('idle'), 2000);
  };

  const sessionId = getSessionId();
  if (!sessionId) {
    return null;
  }

  const buildId = build ?? 'Unknown';
  const builtAt = now ?? new Date();

  const reference = `${sessionId} • ${buildId} • ${builtAt.toISOString()}`;

  return (
    <button
      onClick={() => copyToClipboard(reference)}
      className="bg-primary-foreground text-primary relative flex items-center gap-2 overflow-clip rounded-md px-3 py-2 text-sm shadow-sm"
    >
      <span>{reference}</span>
      <FiCopy />
      {clipboardStatus === 'copied' && (
        <span className="bg-primary-foreground text-primary absolute inset-0 flex items-center justify-center gap-1 text-sm font-medium">
          <FiCheck />
          <span>Copied!</span>
        </span>
      )}
    </button>
  );
};

const getExplanationForError = (error: Error) => {
  if (error instanceof CustomError) {
    return <CustomErrorExplanation error={error} />;
  }
  if (error instanceof ZodError) {
    return <ValidationErrorExplanation error={error} />;
  }
  return <ErrorExplanation error={error} />;
};

export const CriticalErrorBoundary: FC<PropsWithChildren> = ({ children }) => {
  const Fallback: FC<FallbackProps> = ({ error, resetErrorBoundary }) => {
    const email = useVariable<Variables>('supportEmail');

    return (
      <div className="text-primary flex h-screen w-screen md:items-center justify-center p-6">
        <div className="flex w-full max-w-lg flex-col items-center md:justify-center gap-8 text-center">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold leading-6">
              <Balancer>A problem has occurred</Balancer>
            </h1>
            <p className="leading-5">
              <Balancer>
                We're sorry, we've encountered a problem that has stopped the application working as expected.
              </Balancer>
            </p>
          </div>
          {getExplanationForError(error)}
          <div className="flex flex-col gap-3">
            <p className="leading-5">
              <Balancer>
                If this is your first time having problems please try again to see if the problem is resolved.
              </Balancer>
            </p>
            <Link onClick={resetErrorBoundary} to="/auth/signout">
              <Button>Sign out & try again</Button>
            </Link>
          </div>
          <div className="flex flex-col items-center gap-3">
            <p className="leading-5">
              <Balancer>
                If you continue to encounter a problem please contact support with the session reference below.
              </Balancer>
            </p>
            <SessionReference />
            <a target="_blank" onClick={resetErrorBoundary} href={`mailto:$%{email}%`}>
              <Button>Contact support</Button>
            </a>
          </div>
        </div>
      </div>
    );
  };
  return <ReactErrorBoundary FallbackComponent={Fallback}>{children}</ReactErrorBoundary>;
};

export const ErrorBoundary: FC<PropsWithChildren> = ({ children }) => {
  return <div></div>;
};
