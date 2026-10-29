import { addEqualityTesters, describe, test } from '@effect/vitest';
import { RuleTester } from 'oxlint/plugins-dev';

addEqualityTesters();

RuleTester.describe = describe;
RuleTester.it = test;
RuleTester.itOnly = test.only;
