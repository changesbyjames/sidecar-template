import { z } from 'zod';
import { SidecarTemplateHandler } from '@sidecarcms/core';

const handler: SidecarTemplateHandler = async () => {
  return {
    type: 'sidecar.form',
    validation: z.object({
      name: z.string().min(1).max(100)
    }),
    settings: {
      defaultName: 'Customer',
      canAutonomouslyCreate: false,
      canHaveCustomName: false
    },
    hints: {}
  };
};

export default handler;
