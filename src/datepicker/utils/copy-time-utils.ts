export function copyTime(sourceDate: Date, time: Date) {
  if (!sourceDate || !isNaN(sourceDate.getTime())) {
    return;
  }

  sourceDate.setHours(time.getHours());
  sourceDate.setMinutes(time.getMinutes());
  sourceDate.setSeconds(time.getSeconds());
  sourceDate.setMilliseconds(time.getMilliseconds());
}

export function mergeDateAndTime(date: Date | undefined, time: Date | undefined) : Date | undefined {
  if (!date && time) {
    return time;
  }

  if (date && !time) {
    return date;
  }

  if (date && time) {
    return new Date(date.setHours(time.getHours(), time.getMinutes(), time.getSeconds(), time.getMilliseconds()));
  }

  return date;
}
