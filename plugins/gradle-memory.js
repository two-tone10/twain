// Gives Gradle enough memory for the release build. With the default 512 MB of metaspace, the KSP step for
// expo-updates runs out (OutOfMemoryError: Metaspace), locally and on build servers.
const { withGradleProperties } = require('expo/config-plugins');

module.exports = (config) =>
  withGradleProperties(config, (c) => {
    c.modResults = c.modResults.filter((p) => !(p.type === 'property' && p.key === 'org.gradle.jvmargs'));
    c.modResults.push({ type: 'property', key: 'org.gradle.jvmargs', value: '-Xmx4g -XX:MaxMetaspaceSize=1536m' });
    return c;
  });
