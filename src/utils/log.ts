export async function tryOrFail<T>(caller: () => Promise<T>, message?: string) {
  try {
    return await caller();
  } catch (e) {
    console.error(message ?? "An unknown error ocurred.");
    if (process.env.DEBUG === "ENABLED") {
      throw e;
    }
    process.exit(1);
  }
}
