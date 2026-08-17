import * as WebBrowser from 'expo-web-browser';
import { Linking } from 'react-native';

export async function openExternalUrl(url: string) {
  const trimmed = url.trim();
  if (!/^https?:\/\//i.test(trimmed)) {
    throw new Error('Only http(s) links can be opened.');
  }
  await WebBrowser.openBrowserAsync(trimmed, {
    presentationStyle: WebBrowser.WebBrowserPresentationStyle.AUTOMATIC,
  });
}

export async function openMailto(email: string) {
  await Linking.openURL(`mailto:${email}`);
}
