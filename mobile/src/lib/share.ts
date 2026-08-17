import { Share } from 'react-native';

export async function shareContent(title: string, url: string, message?: string) {
  await Share.share({
    title,
    url,
    message: message ? `${message}\n${url}` : url,
  });
}
