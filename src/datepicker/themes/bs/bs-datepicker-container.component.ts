import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  HostBinding,
  OnDestroy,
  OnInit,
  Renderer2,
  ViewChild
} from '@angular/core';

import { take } from 'rxjs/operators';
import { Subject, Subscription } from 'rxjs';

import { getFullYear, getMonth } from 'ngx-bootstrap/chronos';
import { PositioningService } from 'ngx-bootstrap/positioning';
import { TimepickerComponent } from 'ngx-bootstrap/timepicker';

import { datepickerAnimation } from '../../datepicker-animations';
import { BsDatepickerAbstractComponent } from '../../base/bs-datepicker-container';
import { BsDatepickerConfig } from '../../bs-datepicker.config';
import { CalendarCellViewModel, DayViewModel } from '../../models';
import { BsDatepickerActions } from '../../reducer/bs-datepicker.actions';
import { BsDatepickerEffects } from '../../reducer/bs-datepicker.effects';
import { BsDatepickerStore } from '../../reducer/bs-datepicker.store';

@Component({
  selector: 'bs-datepicker-container',
  providers: [BsDatepickerStore, BsDatepickerEffects],
  templateUrl: './bs-datepicker-view.html',
  host: {
    class: 'bottom',
    '(click)': '_stopPropagation($event)',
    role: 'dialog',
    'aria-label': 'calendar'
  },
  animations: [datepickerAnimation]
})
export class BsDatepickerContainerComponent
  extends BsDatepickerAbstractComponent
  implements OnInit, AfterViewInit, OnDestroy
{
  valueChange: EventEmitter<Date> = new EventEmitter<Date>();
  timeValueChange: EventEmitter<Date> = new EventEmitter<Date>();
  valueApplied: Subject<void> = new Subject();
  valueCancelled: Subject<void> = new Subject();
  animationState = 'void';
  override isRangePicker = false;
  _subs: Subscription[] = [];

  @ViewChild('startTP') startTimepicker?: TimepickerComponent;

  set value(value: Date | undefined) {
    this._effects?.setValue(value);
  }

  set timeValue(value: Date | undefined) {
    this._effects?.setValue(value);
  }

  get isDatePickerDisabled(): boolean {
    return !!this._config.isDisabled;
  }

  @HostBinding('attr.disabled') get isDatepickerDisabled() {
    return this.isDatePickerDisabled ? '' : null;
  }

  @HostBinding('attr.readonly') get isDatepickerReadonly() {
    return this.isDatePickerDisabled ? '' : null;
  }

  constructor(
    _renderer: Renderer2,
    private _config: BsDatepickerConfig,
    private _store: BsDatepickerStore,
    private _element: ElementRef,
    private _actions: BsDatepickerActions,
    _effects: BsDatepickerEffects,
    private _positionService: PositioningService
  ) {
    super();
    this._effects = _effects;

    _renderer.setStyle(_element.nativeElement, 'display', 'block');
    _renderer.setStyle(_element.nativeElement, 'position', 'absolute');
  }

  ngOnInit(): void {
    this._positionService.setOptions({
      modifiers: {
        flip: {
          enabled: this._config.adaptivePosition
        },
        preventOverflow: {
          enabled: this._config.adaptivePosition
        }
      },
      allowedPositions: this._config.allowedPositions
    });

    this._positionService.event$?.pipe(take(1)).subscribe(() => {
      this._positionService.disable();

      if (this._config.isAnimated) {
        this.animationState = this.isTopPosition ? 'animated-up' : 'animated-down';

        return;
      }

      this.animationState = 'unanimated';
    });

    this.isOtherMonthsActive = this._config.selectFromOtherMonth;
    this.containerClass = this._config.containerClass;
    this.showTodayBtn = this._config.showTodayButton;
    this.todayBtnLbl = this._config.todayButtonLabel;
    this.todayPos = this._config.todayPosition;
    this.showClearBtn = this._config.showClearButton;
    this.clearBtnLbl = this._config.clearButtonLabel;
    this.clearPos = this._config.clearPosition;
    this.showApplyBtn = this._config.showApplyButton;
    this.showCancelBtn = this._config.showCancelButton;
    this.applyBtnLbl = this._config.applyButtonLabel;
    this.applyPos = this._config.applyPosition;
    this.cancelBtnLbl = this._config.cancelButtonLabel;
    this.customRangeBtnLbl = this._config.customRangeButtonLabel;
    this.withTimepicker = this._config.withTimepicker;
    this._effects
      ?.init(this._store)
      // intial state options
      .setOptions(this._config)
      // data binding view --> model
      .setBindings(this)
      // set event handlers
      .setEventHandlers(this)
      .registerDatepickerSideEffects();

    let currentDate: Date | undefined;
    // todo: move it somewhere else
    // on selected date change
    this._subs.push(
      this._store
        .select((state) => state.selectedDate)
        .subscribe((date) => {
          currentDate = date;
          this.valueChange.emit(date);
        })
    );
    this._subs.push(
      this._store
        .select((state) => state.selectedTime)
        .subscribe((time) => {
          if (!time || !time[0] || !(time[0] instanceof Date) || time[0] === currentDate) {
            return;
          }

          this.timeValueChange.emit(time[0]);
        })
    );

    this._store.dispatch(this._actions.changeViewMode(this._config.startView));
  }

  ngAfterViewInit(): void {
    this.selectedTimeSub.add(
      this.selectedTime?.subscribe((val) => {
        if (Array.isArray(val) && val.length >= 1) {
          this.startTimepicker?.writeValue(val[0]);
        }
      })
    );
    this.startTimepicker?.registerOnChange((val) => {
      this.timeSelectHandler(val, 0);
    });
  }

  get isTopPosition(): boolean {
    return this._element.nativeElement.classList.contains('top');
  }

  positionServiceEnable(): void {
    this._positionService.enable();
  }

  override timeSelectHandler(date: Date, index: number) {
    this._store.dispatch(this._actions.selectTime(date, index));
  }

  override daySelectHandler(day: DayViewModel): void {
    if (!day) {
      return;
    }

    const isDisabled = this.isOtherMonthsActive ? day.isDisabled : day.isOtherMonth || day.isDisabled;

    if (isDisabled) {
      return;
    }

    this._store.dispatch(this._actions.select(day.date));
  }

  override monthSelectHandler(day: CalendarCellViewModel): void {
    if (!day || day.isDisabled) {
      return;
    }

    this._store.dispatch(
      this._actions.navigateTo({
        unit: {
          month: getMonth(day.date),
          year: getFullYear(day.date)
        },
        viewMode: 'day'
      })
    );
  }

  override yearSelectHandler(day: CalendarCellViewModel): void {
    if (!day || day.isDisabled) {
      return;
    }

    this._store.dispatch(
      this._actions.navigateTo({
        unit: {
          year: getFullYear(day.date)
        },
        viewMode: 'month'
      })
    );
  }

  override setToday(): void {
    this._store.dispatch(this._actions.select(new Date()));
  }

  override clearDate(): void {
    this._store.dispatch(this._actions.select(undefined));
  }

  override apply(): void {
    this.valueApplied.next();
  }

  override cancel(): void {
    this.valueCancelled.next();
  }

  ngOnDestroy(): void {
    for (const sub of this._subs) {
      sub.unsubscribe();
    }
    this.selectedTimeSub.unsubscribe();
    this._effects?.destroy();
  }
}
