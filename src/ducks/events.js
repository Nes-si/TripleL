import {Parse} from 'parse';

import {EventData, FilterEventData} from 'models/EventData';
import {store} from 'index';
import {send, getAllObjects} from 'utils/server';
import {getPermissibleAgeLimits} from 'utils/data';
import {UserData} from "../models/UserData";


export const INIT_END           = 'app/events/INIT_END';
export const SHOW_START_EVENTS  = 'app/events/SHOW_START_EVENTS';
export const SHOW_EVENTS        = 'app/events/SHOW_EVENTS';
export const SHOW_EVENT         = 'app/events/SHOW_EVENT';
export const JOIN_EVENT         = 'app/events/JOIN_EVENT';
export const LEAVE_EVENT        = 'app/events/LEAVE_EVENT';
export const CREATE_EVENT       = 'app/events/CREATE_EVENT';
export const UPDATE_EVENT       = 'app/events/UPDATE_EVENT';
export const DELETE_EVENT       = 'app/events/DELETE_EVENT';



async function requestEvents(filter = {}) {
  const userData = store.getState().user.userData;

  const query = new Parse.Query(EventData.OriginClass);
  if (filter.members) {
    if (filter.members.onlyMy)
      query.equalTo("members", Parse.User.current());
  }
  if (filter.date) {
    if (filter.date.greaterThan)
      query.greaterThan("dateEnd", filter.date.greaterThan);
    if (filter.date.lessThan)
      query.lessThan("dateStart", filter.date.lessThan);
    if (filter.date.onlyFuture)
      query.greaterThan("dateEnd", new Date());
    if (filter.date.onlyPast)
      query.lessThan("dateStart", new Date());
  }
  if (filter.price) {
    if (filter.price.onlyFree) {
      query.containedIn("price", [0, undefined]);
    } else {
      if (filter.price.greaterThan)
        query.greaterThan("price", filter.price.greaterThan);
      if (filter.price.lessThan)
        query.lessThan("price", filter.price.lessThan);
    }
  }
  if (filter.age) {
    if (filter.age.my)
      query.containsIn("ageLimit", getPermissibleAgeLimits(userData.age));
    if (filter.age.age != undefined)
      query.containsIn("ageLimit", getPermissibleAgeLimits(filter.age.age));
  }

  const events_o = await send(getAllObjects(query));

  const events = [];
  for (let event_o of events_o) {
    const event = new EventData(event_o);

    event.owner = new UserData(event_o.get('owner'));

    const members_o = event_o.get('members');
    if (members_o) {
      for (let member_o of members_o)
        event.members.push(new UserData(member_o))
    }
    
    events.push(event);
  }

  return events;
}

export function showStartEvents() {
  return async dispatch => {
    let filter = new FilterEventData();
    filter.date.today = true;
    const eventsToday = await requestEvents(filter);

    filter = new FilterEventData();
    filter.date.tomorrow = true;
    const eventsTomorrow = await requestEvents(filter);

    filter = new FilterEventData();
    const eventsNext = await requestEvents(filter);

    dispatch({
      type: SHOW_START_EVENTS,
      eventsToday,
      eventsTomorrow,
      eventsNext
    })
  };
}

export function init() {
  return async dispatch => {
    const filterMy = new FilterEventData();
    filterMy.members.onlyMy = true;

    const events = await requestEvents(filterMy);

    dispatch({
      type: INIT_END,
      events
    });
  };
}

export function showEvents(filter = {}) {
  return async dispatch => {
    const events = await requestEvents(filter);
    dispatch({
      type: SHOW_EVENTS,
      events
    });
  };
}

export function showEvent(id) {
  return async dispatch => {
    const event_o = await send(new Parse.Query(EventData.OriginClass).get(id));
    const event = new EventData(event_o);

    const members_o = event_o.get('members');
    if (members_o) {
      await send(members_o.fetchAll());
      const members = [];
      for (let member_o of members_o) {
        members.push(new UserData(member_o));
      }
      event.members = members;
    }

    dispatch({
      type: SHOW_EVENT,
      event
    });
  }
}

export function joinEvent(event) {
  send(
    Parse.Cloud.run('joinEvent', {id: event.origin.id})
  );

  return {
    type: JOIN_EVENT,
    event
  };
}

export function leaveEvent(event) {
  send(
    Parse.Cloud.run('leaveEvent', {id: event.origin.id})
  );

  return {
    type: LEAVE_EVENT,
    event
  };
}

export function createEvent(event) {
  event.owner = store.getState().user.userData;
  event.updateOrigin();
  event.origin.setACL(new Parse.ACL(event.owner.origin));

  send(event.origin.save());

  return {
    type: CREATE_EVENT,
    event
  };
}

export function updateEvent(event) {
  event.updateOrigin();
  send(event.origin.save());

  return {
    type: UPDATE_EVENT,
    event
  };
}

export function deleteEvent(event) {
  send(event.origin.destroy());

  return {
    type: DELETE_EVENT,
    event
  };
}

const initialState = {
  startEvents: {
    eventsToday: [],
    eventsTomorrow: [],
    eventsNext: []
  },

  userEvents: [],

  currentEvents: [],

  currentEvent: null
};

export default function eventsReducer(state = initialState, action) {
  let userEvents;

  switch (action.type) {
    case SHOW_START_EVENTS:
      return {
        ...state,
        startEvents: {
          eventsToday: action.eventsToday,
          eventsTomorrow: action.eventsTomorrow,
          eventsNext: action.eventsNext
        }
      };

    case INIT_END:
      return {
        ...state,
        userEvents: action.events
      };

    case SHOW_EVENTS:
      return {
        ...state,
        currentEvents: action.events
      };

    case SHOW_EVENT:
      return {
        ...state,
        currentEvent: action.event
      };

    case JOIN_EVENT:
      userEvents = state.userEvents.slice();
      userEvents.push(action.event);
      return {
        ...state,
        userEvents
      };

    case LEAVE_EVENT:
      userEvents = state.userEvents.slice();
      let eventInd = userEvents.indexOf(action.event);
      if (eventInd != -1) {
        userEvents.splice(eventInd, 1);
        return {
          ...state,
          userEvents
        };
      }
      return state;

    case CREATE_EVENT:
      userEvents = state.userEvents;
      userEvents.push(action.event);
      return {
        ...state,
        userEvents
      };

    case UPDATE_EVENT:
      return state;

    case DELETE_EVENT:
      userEvents = state.userEvents;
      userEvents.splice(userEvents.indexOf(action.event), 1);

      return {
        ...state,
        event
      };

    default:
      return state;
  }
}
