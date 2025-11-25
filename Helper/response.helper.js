export const sendSuccess = (res, data, statusCode = 200) => {
  return res.status(statusCode).json({
    responseStatusCode: statusCode,
    successData: data,
    isError: false,
    errorData: null,
  });
};

export const sendError = (res, errorMessage, statusCode = 500, apiErrorType = 1) => {
  return res.status(statusCode).json({
    responseStatusCode: statusCode,
    isError: true,
    errorData: {
      displayMessage: errorMessage,
      apiErrorType: apiErrorType, // Map to your frontend enum
    },
  });
};
