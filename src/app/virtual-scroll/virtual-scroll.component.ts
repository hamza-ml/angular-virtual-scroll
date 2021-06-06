import { CdkVirtualScrollViewport } from '@angular/cdk/scrolling';
import { Component, NgZone, OnDestroy, OnInit, ViewChild } from '@angular/core';

import { fromEvent, Subscription, timer } from 'rxjs';
import { map, take, filter, pairwise, throttleTime } from 'rxjs/operators';

@Component({
  selector: 'app-virtual-scroll',
  templateUrl: './virtual-scroll.component.html',
  styleUrls: ['./virtual-scroll.component.scss'],
})
export class VirtualScrollComponent implements OnInit, OnDestroy {
  @ViewChild('cdkScroller', { static: false })
  scroller: CdkVirtualScrollViewport;

  private throttleLimit = 1000;
  public maxRecordsLimit = 10000;
  private scrollBottomLimit = 50; // Height of an item in scroll-view.
  private defaultValuesLimit = 50;

  public totalRecords = 0;
  public items: Array<number> = [];

  public bottomLoading = false;
  private subscription$: Subscription;

  constructor(private _ngZone: NgZone) {
    this.subscription$ = new Subscription();
  }

  ngOnInit(): void {
    /**
     * Register scroll event on component startup.
     */
    this.setViewScroll();
    this.items = this.getItems(this.defaultValuesLimit);
    this.totalRecords = this.items.length;
  }

  private getItems(limit: number, startIndex = 0): Array<number> {
    const items: Array<number> = [];
    for (let i = 0; i < limit; ++i) {
      items[i] = i + startIndex + 1;
    }
    return items;
  }

  private setNextItems(limit: number): void {
    this.bottomLoading = true;
    /**
     * Dummy timer - For demo purpose.
     * To show spinner
     */
    const dummyTimer = timer(1000);
    dummyTimer.pipe(take(1)).subscribe(() => {
      const nextItems = this.getItems(limit, this.items.length);
      this.items = [...this.items, ...nextItems];
      this.totalRecords = this.items.length;
      this.bottomLoading = false;
    });
  }

  private setViewScroll(): void {
    fromEvent(window, 'wheel')
      .pipe(
        filter(() => !!this.scroller),
        take(1)
      )
      .subscribe(() => this.setScrollOnBottom());
  }

  /**
   * Fetch new values when scroll reaches the bottom of viewport
   * @measureScrollOffset Bottom - Measure remaining elements to reach screen bottom.
   * @pairwise - Returns previous and current value as a pair in array format.
   * @filter - Emit value, only after meeting certain condition(s). i.e. custom start/stop strategy.
   * @throttleTime - Ignore emitting subsequent values for a specific duration.
   */
  private setScrollOnBottom(): void {
    this.subscription$.add(
      this.scroller
        .elementScrolled()
        .pipe(
          map(() => this.scroller.measureScrollOffset('bottom')),
          pairwise(),
          filter(() => this.totalRecords <= this.maxRecordsLimit),
          filter(([y1, y2]) => y2 < y1 && y2 < this.scrollBottomLimit),
          throttleTime(this.throttleLimit)
        )
        .subscribe(() =>
          this._ngZone.run(() => this.setNextItems(this.defaultValuesLimit))
        )
    );
  }

  ngOnDestroy(): void {
    this.subscription$.unsubscribe();
  }
}
