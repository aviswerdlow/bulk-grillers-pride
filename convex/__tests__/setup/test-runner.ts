// Test runner utilities for Convex functions
// This helps us test Convex functions without dealing with the mutation/query wrappers

import { GenericMutationCtx, GenericQueryCtx } from 'convex/server';
import { DataModel } from '../../_generated/dataModel';

// Helper to run a Convex query in tests
export async function runQuery<Args extends Record<string, any>, Return = any>(
  queryFn: any,
  ctx: GenericQueryCtx<DataModel>,
  args: Args
): Promise<Return> {
  // Extract the handler from the Convex query wrapper
  let handler: Function;

  if (typeof queryFn === 'function') {
    handler = queryFn;
  } else if (queryFn && typeof queryFn.handler === 'function') {
    handler = queryFn.handler;
  } else if (queryFn && queryFn._handler && typeof queryFn._handler === 'function') {
    handler = queryFn._handler;
  } else if (queryFn && queryFn._args && queryFn._handler) {
    // This is the standard Convex query wrapper format
    handler = queryFn._handler;
  } else {
    throw new Error('Unable to run query - invalid function format');
  }

  return handler(ctx, args);
}

// Helper to run a Convex mutation in tests
export async function runMutation<Args extends Record<string, any>, Return = any>(
  mutationFn: any,
  ctx: GenericMutationCtx<DataModel>,
  args: Args
): Promise<Return> {
  // Extract the handler from the Convex mutation wrapper
  let handler: Function;

  if (typeof mutationFn === 'function') {
    handler = mutationFn;
  } else if (mutationFn && typeof mutationFn.handler === 'function') {
    handler = mutationFn.handler;
  } else if (mutationFn && mutationFn._handler && typeof mutationFn._handler === 'function') {
    handler = mutationFn._handler;
  } else if (mutationFn && mutationFn._args && mutationFn._handler) {
    // This is the standard Convex mutation wrapper format
    handler = mutationFn._handler;
  } else {
    throw new Error('Unable to run mutation - invalid function format');
  }

  return handler(ctx, args);
}

// Helper to run a Convex action in tests
export async function runAction<Args extends Record<string, any>, Return = any>(
  actionFn: any,
  ctx: any,
  args: Args
): Promise<Return> {
  // If it's a raw handler function, call it directly
  if (typeof actionFn === 'function') {
    return actionFn(ctx, args);
  }

  // If it's a Convex action object with a handler
  if (actionFn && typeof actionFn.handler === 'function') {
    return actionFn.handler(ctx, args);
  }

  // If it's wrapped by Convex's action() function, extract the handler
  if (actionFn && actionFn._handler && typeof actionFn._handler === 'function') {
    return actionFn._handler(ctx, args);
  }

  throw new Error('Unable to run action - invalid function format');
}
