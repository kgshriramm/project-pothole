export type BundledModelLoadResult = {
  model: unknown;
  state: 'loaded' | 'unavailable' | 'error';
  message: string;
};

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return 'Unknown TFLite error';
}

export async function loadBundledTfliteModel(): Promise<BundledModelLoadResult> {
  if (process.env.NODE_ENV === 'test') {
    return {
      model: undefined,
      state: 'unavailable',
      message: 'Skipped model loading during tests.',
    };
  }

  try {
    const { loadTensorflowModel } = require('react-native-fast-tflite') as {
      loadTensorflowModel: (source: number, delegates: string[]) => Promise<unknown>;
    };

    const model = await loadTensorflowModel(require('../../assets/model.tflite'), []);
    return {
      model,
      state: 'loaded',
      message: 'TFLite model loaded successfully.',
    };
  } catch (error) {
    const message = getErrorMessage(error);
    const isCustomBuildIssue =
      message.includes('Nitro') ||
      message.includes('native module') ||
      message.includes('TfliteModule') ||
      message.includes('AssetLoader');

    return {
      model: undefined,
      state: isCustomBuildIssue ? 'unavailable' : 'error',
      message: isCustomBuildIssue
        ? 'TFLite runtime needs a custom Expo dev build. Expo Go cannot run the bundled model.'
        : message,
    };
  }
}
