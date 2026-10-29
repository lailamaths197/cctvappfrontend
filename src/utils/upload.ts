import { Platform } from 'react-native';

/** A photo chosen with expo-image-picker (only the fields we need). */
export interface PickedImage {
  uri: string;
  name?: string | null;
  mimeType?: string | null;
}

/**
 * Appends every image under the SAME multipart key (`field`), which is how the
 * Django backend receives an array of files (request.data.getlist('images')).
 *
 * Phones and browsers need different shapes:
 *  - React Native FormData takes a { uri, name, type } descriptor
 *  - a web browser FormData needs a real Blob/File, so we fetch the picked URI first
 */
export async function appendImages(form: FormData, field: string, images: PickedImage[]): Promise<void> {
  for (let i = 0; i < images.length; i++) {
    const img = images[i];
    const type = img.mimeType ?? 'image/jpeg';
    const ext = type.split('/')[1] ?? 'jpg';
    const name = `${field}_${Date.now()}_${i}.${ext}`;

    if (Platform.OS === 'web') {
      const blob = await (await fetch(img.uri)).blob();
      form.append(field, blob, name);
    } else {
      form.append(field, { uri: img.uri, name, type } as any);
    }
  }
}
