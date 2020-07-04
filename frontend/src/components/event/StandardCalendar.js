import React from "react";
import moment from "moment-timezone";
import WeekCalendar from "react-week-calendar";

import CustomModal from "./CustomModal";

const { Login, Timerange, Timeranges } = require("../../proto/hermes_pb.js");
const { GatewayPromiseClient } = require("../../proto/hermes_grpc_web_pb.js");

export default class StandardCalendar extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      selectedIntervals: [],
    };
  }

  async componentDidMount() {
    await this.setState({
      gateway: new GatewayPromiseClient(process.env.REACT_APP_BACKEND),
    });
    this.reloadCalendar();
  }

  componentDidUpdate(prevProps) {
    if (this.props.event !== prevProps.event) {
      this.reloadCalendar();
    }
  }

  handleEventRemove = (event) => {
    let timerange = new Timerange();

    const { selectedIntervals } = this.state;
    const index = selectedIntervals.findIndex(
      (interval) => interval.uid === event.uid
    );
    timerange.setId(selectedIntervals[index].uid);

    const timeranges = new Timeranges();
    timeranges.setToken(localStorage.getItem("token"));
    timeranges.setTimerangesList([timerange]);

    this.state.gateway
      .deleteTimeranges(timeranges, {})
      .then((response) => {
        this.reloadCalendar();
      })
      .catch((err) => {
        console.error(`error: ${err.code}, "${err.message}"`);
      });
  };

  handleSelect = (newIntervals) => {
    const timeranges = new Timeranges();
    timeranges.setToken(localStorage.getItem("token"));
    timeranges.setEvent(this.props.event);
    timeranges.setTimerangesList(
      newIntervals.map((interval) => {
        let timerange = new Timerange();
        timerange.setStart(interval.start.unix());
        timerange.setEnd(interval.end.unix());
        return timerange;
      })
    );

    this.state.gateway
      .setTimeranges(timeranges, {})
      .then((response) => {
        this.reloadCalendar();
      })
      .catch((err) => {
        console.error(`error: ${err.code}, "${err.message}"`);
      });
  };

  reloadCalendar = () => {
    var login = new Login();
    login.setToken(localStorage.getItem("token"));
    login.setEvent(this.props.event);

    this.state.gateway
      .getTimeranges(login, {})
      .then((response) => {
        const intervals = response
          .getTimerangesList()
          .filter((timerange) => {
            return moment.unix(timerange.getEnd()) > moment.now();
          })
          .map((timerange) => {
            const startDatetime = moment.tz(
              moment.unix(timerange.getStart()),
              timerange.getTz()
            );
            const startDayDelta = startDatetime.diff(
              moment.tz(moment(), timerange.getTz()).startOf("day"),
              "days"
            );
            const endDatetime = moment.tz(
              moment.unix(timerange.getEnd()),
              timerange.getTz()
            );
            const endDayDelta = endDatetime.diff(
              moment.tz(moment(), timerange.getTz()).startOf("day"),
              "days"
            );

            let browserOffset =
              -1 * moment.tz.zone(this.props.tz).utcOffset(moment());
            let timerangeOffset = startDatetime.utcOffset();
            let displayOffset = browserOffset - timerangeOffset;

            return {
              start: moment({
                h: startDatetime.hour(),
                m: startDatetime.minute(),
              })
                .add(displayOffset, "minutes")
                .add(startDayDelta, "d"),
              end: moment({
                h: endDatetime.hour(),
                m: endDatetime.minute(),
              })
                .add(displayOffset, "minutes")
                .add(endDayDelta, "d"),
              uid: timerange.getId(),
              value: ``,
            };
          });

        this.setState({
          selectedIntervals: intervals,
        });
      })
      .catch((err) => {
        console.error(`error: ${err.code}, "${err.message}"`);
      });
  };

  render() {
    return (
      <WeekCalendar
        dayFormat={"ddd Do"}
        scaleUnit={30}
        cellHeight={21}
        numberOfDays={9}
        // startTime={moment({ h: 0, m: 0 })}
        // endTime={moment({ h: 0, m: 0 })}
        selectedIntervals={this.state.selectedIntervals}
        onIntervalSelect={this.handleSelect}
        onIntervalRemove={this.handleEventRemove}
        showModalCase={["edit"]}
        modalComponent={CustomModal}
      />
    );
  }
}