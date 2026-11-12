// Settings for `npm run studio` (Remotion CLI). Renders go through pipeline/render.ts.
import { Config } from '@remotion/cli/config';

Config.setEntryPoint('remotion/index.ts');
// public dir = projects/ → footage is never copied, staticFile('<slug>/input/footage/…')
Config.setPublicDir('projects');
Config.setVideoImageFormat('jpeg');
Config.setOverwriteOutput(true);
