// @ts-nocheck
// Global error handling middleware 

export const errorHandler = async (c: any, next: any) => { await next(); };
