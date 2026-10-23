import type { LocalizeFunc } from "../../../../../common/translations/localize";
import type {
  Attribute,
  Cluster,
  Command,
  ZHADevice,
  ZHAGroup,
} from "../../../../../data/zha";

export const formatAsPaddedHex = (value: string | number): string => {
  let hex = value;
  if (typeof value === "string") {
    hex = parseInt(value, 16);
  }
  return "0x" + hex.toString(16).padStart(4, "0");
};

export const getIeeeTail = (ieee: string) =>
  ieee.split(":").slice(-4).reverse().join("");

export const sortZHADevices = (a: ZHADevice, b: ZHADevice): number => {
  const nameA = a.user_given_name ? a.user_given_name : a.name;
  const nameb = b.user_given_name ? b.user_given_name : b.name;
  return nameA.localeCompare(nameb);
};

export const sortZHAGroups = (a: ZHAGroup, b: ZHAGroup): number => {
  const nameA = a.name;
  const nameb = b.name;
  return nameA.localeCompare(nameb);
};

export const computeClusterKey = (cluster: Cluster): string =>
  `${cluster.name} (Endpoint id: ${
    cluster.endpoint_id
  }, Id: ${formatAsPaddedHex(cluster.id)}, Type: ${cluster.type})`;

export const computeClusterSecondary = (
  cluster: Cluster,
  localize: LocalizeFunc
): string =>
  localize("ui.panel.config.zha.clusters.cluster_description", {
    endpoint: cluster.endpoint_id,
    id: formatAsPaddedHex(cluster.id),
    type: cluster.type,
  });

export const computeClusterValue = (cluster: Cluster): string =>
  `${cluster.endpoint_id}-${cluster.id}-${cluster.type}`;

export const computeCommandSecondary = (
  command: Command,
  localize: LocalizeFunc
): string =>
  localize("ui.panel.config.zha.cluster_commands.command_description", {
    id: formatAsPaddedHex(command.id),
    type: command.type,
  });

// A Zigbee command ID is only unique within one direction, so a cluster can define
// a client and a server command with the same ID
export const computeCommandValue = (command: Command): string =>
  `${command.id}-${command.name}-${command.type}`;

export const computeAttributeSecondary = (
  attribute: Attribute,
  localize: LocalizeFunc
): string =>
  typeof attribute.manufacturer_code === "number"
    ? localize(
        "ui.panel.config.zha.cluster_attributes.attribute_description_manufacturer_specific",
        {
          id: formatAsPaddedHex(attribute.id),
          manufacturer_code: formatAsPaddedHex(attribute.manufacturer_code),
        }
      )
    : localize("ui.panel.config.zha.cluster_attributes.attribute_description", {
        id: formatAsPaddedHex(attribute.id),
      });
