import { mutation } from './_generated/server';

export default mutation({
  handler: async (ctx) => {
    return { message: "Test function works!" };
  },
});