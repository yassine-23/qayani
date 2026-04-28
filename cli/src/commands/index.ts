import { Command } from 'commander';
import { banner } from '../ui/theme.js';
import { registerInit } from './init.js';
import { registerRun } from './run.js';
import { registerList } from './list.js';
import { registerConfig } from './config.js';
import { registerFleet } from './fleet.js';
import { registerDeploy } from './deploy.js';
import { registerShare } from './share.js';
import { registerDashboard } from './dashboard.js';
import { registerArmy } from './army.js';
import { registerAtomiumManage } from './atomium-manage.js';
import { addAtomiumViewSubcommand } from './atomium-view.js';

const program = new Command();

program
  .name('qayani')
  .description('Build, configure, and deploy AI agents from your terminal')
  .version('0.1.0')
  .addHelpText('before', banner());

registerInit(program);
registerRun(program);
registerList(program);
registerConfig(program);
registerFleet(program);
registerDeploy(program);
registerShare(program);
registerDashboard(program);
registerArmy(program);
const atomiumCmd = registerAtomiumManage(program);
addAtomiumViewSubcommand(atomiumCmd);

program.parse();
