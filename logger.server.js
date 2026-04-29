// logger.server.js (Node only)
export const log = (...args) => {
  if (process.env.NODE_ENV !== "production") {
    console.log(...args); // ✅ NOT log()
  }
};
