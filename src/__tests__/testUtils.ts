import { Request, Response, NextFunction } from 'express';

export const mockRequest = (options: any = {}): Partial<Request> => {
  return {
    body: options.body || {},
    params: options.params || {},
    query: options.query || {},
    user: options.user || null,
    cookies: options.cookies || {},
    ...options
  } as Partial<Request>;
};

export const mockResponse = (): Partial<Response> => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.cookie = jest.fn().mockReturnValue(res);
  res.clearCookie = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res as Partial<Response>;
};

export const mockNext: NextFunction = jest.fn();
