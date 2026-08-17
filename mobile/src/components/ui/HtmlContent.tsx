import { StyleSheet, Text, View } from 'react-native';

import { htmlToBlocks } from '@/lib/html';
import { color, space, type } from '@/theme/tokens';

const colors = color.light;

export function HtmlContent({ html }: { html: string }) {
  const blocks = htmlToBlocks(html);
  return (
    <View style={styles.wrap} accessibilityRole="text">
      {blocks.map((block, index) => {
        if (block.type === 'heading') {
          return (
            <Text key={index} style={block.level === 1 ? styles.h1 : styles.h2}>
              {block.text}
            </Text>
          );
        }
        if (block.type === 'quote') {
          return (
            <View key={index} style={styles.quote}>
              <Text style={styles.quoteText}>{block.text}</Text>
            </View>
          );
        }
        if (block.type === 'list') {
          return (
            <View key={index} style={styles.list}>
              {block.items.map((item, itemIndex) => (
                <Text key={itemIndex} style={styles.body}>
                  {block.ordered ? `${itemIndex + 1}. ` : '• '}
                  {item}
                </Text>
              ))}
            </View>
          );
        }
        return (
          <Text key={index} style={styles.body}>
            {block.text}
          </Text>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.md },
  h1: { ...type.title, color: colors.text },
  h2: { ...type.subtitle, color: colors.text },
  body: { ...type.body, color: colors.text },
  quote: {
    borderLeftWidth: 4,
    borderLeftColor: colors.brand,
    paddingLeft: space.md,
  },
  quoteText: { ...type.body, color: colors.textSecondary, fontStyle: 'italic' },
  list: { gap: space.xs },
});
