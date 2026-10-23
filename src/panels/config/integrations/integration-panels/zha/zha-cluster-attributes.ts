import type { CSSResultGroup, PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../../../components/buttons/ha-call-service-button";
import "../../../../../components/buttons/ha-progress-button";
import "../../../../../components/ha-select";
import type { HaSelectSelectEvent } from "../../../../../components/ha-select";
import "../../../../../components/input/ha-input";
import { forwardHaptic } from "../../../../../data/haptics";
import type {
  Attribute,
  Cluster,
  ReadAttributeServiceData,
  ZHADevice,
} from "../../../../../data/zha";
import {
  fetchAttributesForCluster,
  readAttributeValue,
} from "../../../../../data/zha";
import { haStyle } from "../../../../../resources/styles";
import type { HomeAssistant } from "../../../../../types";
import { computeAttributeSecondary } from "./functions";
import type { SetAttributeServiceData } from "./types";

@customElement("zha-cluster-attributes")
export class ZHAClusterAttributes extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public device?: ZHADevice;

  @property({ attribute: false })
  public selectedCluster?: Cluster;

  @state() private _attributes: Attribute[] | undefined;

  @state() private _selectedAttribute?: Attribute;

  @state() private _attributeValue?: any = "";

  @state() private _readingAttribute = false;

  @state()
  private _setAttributeServiceData?: SetAttributeServiceData;

  protected updated(changedProperties: PropertyValues<this>): void {
    if (changedProperties.has("selectedCluster")) {
      this._attributes = undefined;
      this._selectAttribute(undefined);
      this._fetchAttributesForCluster();
    }
    super.updated(changedProperties);
  }

  protected render() {
    if (!this.device || !this.selectedCluster || !this._attributes) {
      return nothing;
    }
    return html`
      <div class="content">
        <div class="attribute-picker">
          <ha-select
            .label=${this.hass!.localize(
              "ui.panel.config.zha.cluster_attributes.attributes_of_cluster"
            )}
            class="menu"
            .value=${this._selectedAttribute?.name}
            @selected=${this._selectedAttributeChanged}
            .options=${this._attributes.map((entry) => ({
              value: entry.name,
              label: `${entry.name} (${computeAttributeSecondary(
                entry,
                this.hass!.localize
              )})`,
            }))}
          >
          </ha-select>
        </div>
        ${this._selectedAttribute ? this._renderAttributeInteractions() : nothing}
      </div>
    `;
  }

  private _renderAttributeInteractions(): TemplateResult {
    return html`
      <div class="input-text">
        <ha-input
          .label=${this.hass!.localize("ui.panel.config.zha.common.value")}
          .value=${this._attributeValue}
          @change=${this._onAttributeValueChanged}
          .placeholder=${this.hass!.localize(
            "ui.panel.config.zha.common.value"
          )}
        ></ha-input>
      </div>
      <div class="card-actions">
        <ha-call-service-button
          domain="zha"
          service="set_zigbee_cluster_attribute"
          .data=${this._setAttributeServiceData}
        >
          ${this.hass!.localize(
            "ui.panel.config.zha.cluster_attributes.write_zigbee_attribute"
          )}
        </ha-call-service-button>
        <ha-progress-button
          @click=${this._onGetZigbeeAttributeClick}
          .progress=${this._readingAttribute}
          .disabled=${this._readingAttribute}
        >
          ${this.hass!.localize(
            "ui.panel.config.zha.cluster_attributes.read_zigbee_attribute"
          )}
        </ha-progress-button>
      </div>
    `;
  }

  private async _fetchAttributesForCluster(): Promise<void> {
    if (this.device && this.selectedCluster && this.hass) {
      const cluster = this.selectedCluster;
      const attributes = await fetchAttributesForCluster(
        this.hass,
        this.device.ieee,
        cluster.endpoint_id,
        cluster.id,
        cluster.type
      );
      // Another cluster can be selected while this request is in flight
      if (this.selectedCluster !== cluster) {
        return;
      }
      attributes.sort((a, b) => a.name.localeCompare(b.name));
      this._attributes = attributes;
      // Selecting an attribute programmatically fires no `selected` event, so the
      // action data for the pre-selected attribute has to be derived here
      this._selectAttribute(attributes[0]);
    }
  }

  private _selectAttribute(attribute?: Attribute): void {
    this._selectedAttribute = attribute;
    this._attributeValue = "";
    this._setAttributeServiceData = this._computeSetAttributeServiceData();
  }

  private _computeReadAttributeServiceData():
    ReadAttributeServiceData | undefined {
    if (!this.selectedCluster || !this.device || !this._selectedAttribute) {
      return undefined;
    }
    return {
      ieee: this.device.ieee,
      endpoint_id: this.selectedCluster.endpoint_id,
      cluster_id: this.selectedCluster.id,
      cluster_type: this.selectedCluster.type,
      attribute: this._selectedAttribute.name,
    };
  }

  private _computeSetAttributeServiceData():
    SetAttributeServiceData | undefined {
    if (!this.selectedCluster || !this.device || !this._selectedAttribute) {
      return undefined;
    }
    return {
      ieee: this.device.ieee,
      endpoint_id: this.selectedCluster.endpoint_id,
      cluster_id: this.selectedCluster.id,
      cluster_type: this.selectedCluster.type,
      attribute: this._selectedAttribute.name,
      value: this._attributeValue,
    };
  }

  private _onAttributeValueChanged(event: InputEvent): void {
    this._attributeValue = (event.target as HTMLInputElement).value;
    this._setAttributeServiceData = this._computeSetAttributeServiceData();
  }

  private async _onGetZigbeeAttributeClick(ev: CustomEvent): Promise<void> {
    const button = ev.currentTarget as any;
    const attribute = this._selectedAttribute;
    const data = this._computeReadAttributeServiceData();
    if (data && this.hass) {
      this._readingAttribute = true;
      try {
        const value = await readAttributeValue(this.hass, data);
        // The selection can change while the read is in flight, and the value
        // read belongs to the attribute that was selected when it started
        if (this._selectedAttribute === attribute) {
          this._attributeValue = value;
          this._setAttributeServiceData =
            this._computeSetAttributeServiceData();
        }
        forwardHaptic(this, "success");
        button.actionSuccess();
      } catch (_err: any) {
        forwardHaptic(this, "failure");
        button.actionError();
      } finally {
        this._readingAttribute = false;
      }
    }
  }

  private _selectedAttributeChanged(event: HaSelectSelectEvent): void {
    this._selectAttribute(
      this._attributes?.find(
        (attribute) => attribute.name === event.detail.value
      )
    );
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        :host {
          display: block;
        }

        .content {
          padding-top: var(--ha-space-4);
        }

        ha-select {
          margin-top: 16px;
        }

        .menu,
        ha-input {
          width: 100%;
        }

        .attribute-picker {
          padding-left: 28px;
          padding-right: 28px;
          padding-inline-start: 28px;
          padding-inline-end: 28px;
          padding-bottom: 10px;
        }

        .input-text {
          padding-left: 28px;
          padding-right: 28px;
          padding-inline-start: 28px;
          padding-inline-end: 28px;
          padding-bottom: 10px;
        }

        .card-actions {
          display: flex;
          border-top: 1px solid var(--divider-color);
          padding: var(--ha-space-2);
          justify-content: flex-end;
          gap: var(--ha-space-2);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "zha-cluster-attributes": ZHAClusterAttributes;
  }
}
