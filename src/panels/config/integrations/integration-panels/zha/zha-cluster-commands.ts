import type { CSSResultGroup, PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../../../components/buttons/ha-call-service-button";
import "../../../../../components/ha-form/ha-form";
import "../../../../../components/ha-select";
import type { HaSelectSelectEvent } from "../../../../../components/ha-select";
import type { Cluster, Command, ZHADevice } from "../../../../../data/zha";
import { fetchCommandsForCluster } from "../../../../../data/zha";
import { haStyle } from "../../../../../resources/styles";
import type { HomeAssistant } from "../../../../../types";
import { computeCommandSecondary, computeCommandValue } from "./functions";
import type { IssueCommandServiceData } from "./types";

@customElement("zha-cluster-commands")
export class ZHAClusterCommands extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: "is-wide", type: Boolean }) public isWide = false;

  @property({ attribute: false }) public device?: ZHADevice;

  @property({ attribute: false })
  public selectedCluster?: Cluster;

  @state() private _commands: Command[] | undefined;

  @state() private _selectedCommand?: Command;

  @state()
  private _issueClusterCommandServiceData?: IssueCommandServiceData;

  @state()
  private _canIssueCommand = false;

  @state()
  private _commandData: Record<string, any> = {};

  protected updated(changedProperties: PropertyValues<this>): void {
    if (changedProperties.has("selectedCluster")) {
      this._commands = undefined;
      this._selectCommand(undefined);
      this._fetchCommandsForCluster();
    }
    super.updated(changedProperties);
  }

  protected render() {
    if (!this.device || !this.selectedCluster || !this._commands) {
      return nothing;
    }
    return html`
      <div class="content">
        <div class="command-picker">
          <ha-select
            .label=${this.hass!.localize(
              "ui.panel.config.zha.cluster_commands.commands_of_cluster"
            )}
            class="menu"
            .value=${
              this._selectedCommand
                ? computeCommandValue(this._selectedCommand)
                : undefined
            }
            @selected=${this._selectedCommandChanged}
            .options=${this._commands.map((entry) => ({
              value: computeCommandValue(entry),
              label: `${entry.name} (${computeCommandSecondary(
                entry,
                this.hass!.localize
              )})`,
            }))}
          >
          </ha-select>
        </div>
        ${
          this._selectedCommand
            ? html`
                <div class="command-form">
                  <ha-form
                    .hass=${this.hass}
                    .schema=${this._selectedCommand.schema}
                    @value-changed=${this._commandDataChanged}
                    .data=${this._commandData}
                  ></ha-form>
                </div>
                <div class="card-actions">
                  <ha-call-service-button
                    domain="zha"
                    service="issue_zigbee_cluster_command"
                    .data=${this._issueClusterCommandServiceData}
                    .disabled=${!this._canIssueCommand}
                    appearance="accent"
                  >
                    ${this.hass!.localize(
                      "ui.panel.config.zha.cluster_commands.issue_zigbee_command"
                    )}
                  </ha-call-service-button>
                </div>
              `
            : ""
        }
      </div>
    `;
  }

  private async _fetchCommandsForCluster(): Promise<void> {
    if (this.device && this.selectedCluster && this.hass) {
      const cluster = this.selectedCluster;
      const commands = await fetchCommandsForCluster(
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
      commands.sort((a, b) => a.name.localeCompare(b.name));
      this._commands = commands;
      // Selecting a command programmatically fires no `selected` event, so the
      // action data for the pre-selected command has to be derived here
      this._selectCommand(commands[0]);
    }
  }

  private _selectCommand(command?: Command): void {
    this._selectedCommand = command;
    // Commands have their own fields, so keeping the previous command's values
    // would submit them under the new command's parameter names
    this._commandData = {};
    this._updateIssueClusterCommandServiceData();
  }

  private _updateIssueClusterCommandServiceData(): void {
    const command = this._selectedCommand;
    if (!this.device || !this.selectedCluster || !command) {
      this._canIssueCommand = false;
      this._issueClusterCommandServiceData = undefined;
      return;
    }

    this._canIssueCommand = command.schema.every(
      (field) =>
        !field.required ||
        !["", undefined].includes(this._commandData[field.name])
    );

    this._issueClusterCommandServiceData = {
      ieee: this.device.ieee,
      endpoint_id: this.selectedCluster.endpoint_id,
      cluster_id: this.selectedCluster.id,
      cluster_type: this.selectedCluster.type,
      command: command.id,
      command_type: command.type,
      params: this._commandData,
    };
  }

  private _commandDataChanged(ev: CustomEvent): void {
    this._commandData = ev.detail.value;
    this._updateIssueClusterCommandServiceData();
  }

  private _selectedCommandChanged(event: HaSelectSelectEvent): void {
    this._selectCommand(
      this._commands?.find(
        (command) => computeCommandValue(command) === event.detail.value
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
        .menu {
          width: 100%;
        }

        .command-picker {
          padding-left: 28px;
          padding-right: 28px;
          padding-inline-start: 28px;
          padding-inline-end: 28px;
          padding-bottom: 10px;
        }

        .command-form {
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
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "zha-cluster-commands": ZHAClusterCommands;
  }
}
