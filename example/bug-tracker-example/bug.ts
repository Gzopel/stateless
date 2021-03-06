import { StateMachine } from '../../src';
import { UmlDotGraph } from '../../src/graph/uml-dot-graph';

enum State {
  Open = 'Open',
  Assigned = 'Assigned',
  Deferred = 'Deferred',
  Resolved = 'Resolved',
  Closed = 'Closed'
}
enum Trigger {
  Assign = 'Assign',
  Defer = 'Defer',
  Resolve = 'Resolve',
  Close = 'Close'
}

/**
 * Bug class definition.
 * 
 * @export
 * @class Bug
 * @link: https://github.com/dotnet-state-machine/stateless/blob/dev/example/BugTrackerExample/Bug.cs
 */
export class Bug {
  private _state: State = State.Open;
  private _machine: StateMachine<State, Trigger>;
  private _title: string;
  private _assignee: string | null = null;

  constructor(title: string) {
    this._title = title;

    this._machine = new StateMachine<State, Trigger>({
      accessor: () => this._state,
      mutator: s => this._state = s
    });

    this._machine.configure(State.Open)
      .permit(Trigger.Assign, State.Assigned);

    this._machine.configure(State.Assigned)
      .substateOf(State.Open)
      .onEntryFrom(Trigger.Assign, (_, assignee: string) => this.onAssigned(assignee))
      .permitReentry(Trigger.Assign)
      .permit(Trigger.Close, State.Closed)
      .permit(Trigger.Defer, State.Deferred)
      .onExit(() => this.onDeassigned());

    this._machine.configure(State.Deferred)
      .onEntry(() => { this._assignee = null; })
      .permit(Trigger.Assign, State.Assigned);
  }

  private onDeassigned(): any {
    this.sendEmailToAssignee('You\'re off the hook.');
  }

  private onAssigned(assignee: string): any {
    if (!!this._assignee && assignee !== this._assignee) {
      this.sendEmailToAssignee('Don\'t forget to help the new employee!');
    }

    this._assignee = assignee;
    this.sendEmailToAssignee('You own it.');
  }

  public async close(): Promise<void> {
    await this._machine.fire(Trigger.Close);
  }

  public async assign(assignee: string): Promise<void> {
    await this._machine.fire(Trigger.Assign, assignee);
  }

  public get canAssign(): Promise<boolean> {
    return this._machine.canFire(Trigger.Assign);
  }

  public async defer(): Promise<void> {
    await this._machine.fire(Trigger.Defer);
  }

  public sendEmailToAssignee(message: string): void {
    console.log(`${this._assignee}, RE ${this._title}: ${message}`);
  }

  public toDotGraph(): string {
    return UmlDotGraph.format(this._machine.getInfo('State', 'Trigger'));
  }
}
