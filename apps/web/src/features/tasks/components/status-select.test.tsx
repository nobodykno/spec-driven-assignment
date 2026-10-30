import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { allowedStatusOptions, StatusSelect } from './status-select.tsx';

afterEach(cleanup);

describe('StatusSelect', () => {
  it('FR-UI-007: a TODO task only offers TODO and IN_PROGRESS', () => {
    expect(allowedStatusOptions('TODO')).toEqual(['TODO', 'IN_PROGRESS']);
    render(<StatusSelect current="TODO" onChange={() => undefined} />);
    const options = screen.getAllByRole('option').map((option) => option.textContent);
    expect(options).toEqual(['TODO', 'IN_PROGRESS']);
  });

  it('FR-UI-007: an IN_REVIEW task offers IN_PROGRESS and DONE but not TODO', () => {
    expect(allowedStatusOptions('IN_REVIEW')).toEqual(['IN_REVIEW', 'IN_PROGRESS', 'DONE']);
  });

  it('FR-UI-007: a DONE task can only be reopened to IN_PROGRESS', () => {
    expect(allowedStatusOptions('DONE')).toEqual(['DONE', 'IN_PROGRESS']);
  });
});
